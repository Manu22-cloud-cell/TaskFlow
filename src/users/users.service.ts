import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserRole } from '../generated/prisma/enums.js';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll() {
        return this.prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }

    async findOne(id: number) {
        const user = await this.prisma.user.findUnique({
            where: {
                id,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    /**
     * Used by authentication to find a user by email.
     * This returns the password hash because AuthService
     * needs it to verify the supplied password.
     */
    async findByEmailForAuth(email: string) {
        return this.prisma.user.findUnique({
            where: {
                email,
            },
        });
    }

    /**
     * Used by authentication to find a user by ID.
     * This returns the authentication-related fields,
     * including the stored refresh-token hash.
     */
    async findByIdForAuth(id: number) {
        return this.prisma.user.findUnique({
            where: {
                id,
            },
        });
    }

    async create(createUserDto: CreateUserDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: {
                email: createUserDto.email,
            },
        });

        if (existingUser) {
            throw new ConflictException('Email already exists');
        }

        const hashedPassword = await bcrypt.hash(
            createUserDto.password,
            10,
        );

        const user = await this.prisma.user.create({
            data: {
                name: createUserDto.name,
                email: createUserDto.email,
                password: hashedPassword,
            },
        });

        const { password, ...safeUser } = user;

        return safeUser;
    }

    async update(
        id: number,
        updateUserDto: UpdateUserDto,
        requesterId?: number,
    ) {
        const existingUser = await this.prisma.user.findUnique({
            where: {
                id,
            },
        });

        if (!existingUser) {
            throw new NotFoundException('User not found');
        }

        if (
            existingUser.role === UserRole.ADMIN &&
            updateUserDto.role !== undefined &&
            updateUserDto.role !== UserRole.ADMIN
        ) {
            const adminCount = await this.prisma.user.count({
                where: { role: UserRole.ADMIN },
            });

            if (adminCount <= 1) {
                throw new ForbiddenException('The last admin cannot be demoted');
            }
        }

        if (
            requesterId === id &&
            updateUserDto.role !== undefined &&
            updateUserDto.role !== UserRole.ADMIN
        ) {
            throw new ForbiddenException(
                'Admins cannot remove their own admin role',
            );
        }

        if (updateUserDto.email) {
            const emailUser = await this.prisma.user.findUnique({
                where: {
                    email: updateUserDto.email,
                },
            });

            if (emailUser && emailUser.id !== id) {
                throw new ConflictException('Email already exists');
            }
        }

        const data = {
            ...updateUserDto,
            ...(updateUserDto.password && {
                password: await bcrypt.hash(
                    updateUserDto.password,
                    10,
                ),
            }),
        };

        return this.prisma.user.update({
            where: {
                id,
            },
            data,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    }

    async remove(id: number) {
        const existingUser = await this.prisma.user.findUnique({
            where: {
                id,
            },
        });

        if (!existingUser) {
            throw new NotFoundException('User not found');
        }

        if (existingUser.role === UserRole.ADMIN) {
            const adminCount = await this.prisma.user.count({
                where: { role: UserRole.ADMIN },
            });

            if (adminCount <= 1) {
                throw new ForbiddenException('The last admin cannot be deleted');
            }
        }

        await this.prisma.user.delete({
            where: {
                id,
            },
        });

        return {
            message: 'User deleted successfully',
        };
    }

    /**
     * Stores the refresh-token hash after login
     * or refresh-token rotation.
     */
    async updateRefreshToken(
        id: number,
        refreshTokenHash: string,
        refreshTokenExpiresAt: Date,
    ) {
        await this.prisma.user.update({
            where: {
                id,
            },
            data: {
                refreshTokenHash,
                refreshTokenExpiresAt,
            },
        });
    }

    async clearRefreshToken(id: number) {
        await this.prisma.user.update({
            where: { id },
            data: {
                refreshTokenHash: null,
                refreshTokenExpiresAt: null,
            },
        });
    }
}
