import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll() {
        return this.prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
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
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async findByEmailForAuth(email: string) {
        return this.prisma.user.findUnique({
            where: {
                email,
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

        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

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

    async update(id: number, updateUserDto: UpdateUserDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!existingUser) {
            throw new NotFoundException('User not found');
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
                password: await bcrypt.hash(updateUserDto.password, 10),
            }),
        };

        const user = await this.prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return user;
    }

    async remove(id: number) {
        const existingUser = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!existingUser) {
            throw new NotFoundException('User not found');
        }

        await this.prisma.user.delete({
            where: { id },
        });

        return {
            message: 'User deleted successfully',
        };
    }
}