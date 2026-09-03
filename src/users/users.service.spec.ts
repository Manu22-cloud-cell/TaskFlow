import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.unstable_mockModule('bcrypt', () => ({
  hash: jest.fn(),
}));

const { UsersService } = await import('./users.service.js');
const bcrypt = await import('bcrypt');

describe('UsersService', () => {
  let service: UsersService;

  const prisma = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new UsersService(prisma as any);
  });

  describe('findAll', () => {
    it('should return all users without passwords', async () => {
      const users = [
        {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      prisma.user.findMany.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toEqual(users);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return a user when the user exists', async () => {
      const user = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findOne(1);

      expect(result).toEqual(user);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should throw NotFoundException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        new NotFoundException('User not found'),
      );
    });
  });

  describe('create', () => {
    it('should create a user successfully', async () => {
      const dto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const hashedPassword = 'hashed-password';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      prisma.user.findUnique.mockResolvedValue(null);

      prisma.user.create.mockResolvedValue({
        id: 1,
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          email: dto.email,
          password: hashedPassword,
        },
      });

      expect(result).not.toHaveProperty('password');
      expect(result.name).toBe(dto.name);
      expect(result.email).toBe(dto.email);
    });

    it('should throw ConflictException when email already exists', async () => {
      const dto = {
        name: 'Test User',
        email: 'existing@example.com',
        password: 'password123',
      };

      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        name: 'Existing User',
        email: dto.email,
      });

      await expect(service.create(dto)).rejects.toThrow(
        new ConflictException('Email already exists'),
      );

      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a user successfully', async () => {
      const dto = {
        name: 'Updated User',
      };

      const existingUser = {
        id: 1,
        name: 'Old User',
        email: 'test@example.com',
        password: 'old-hash',
      };

      const updatedUser = {
        id: 1,
        name: 'Updated User',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.user.findUnique.mockResolvedValue(existingUser);
      prisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(1, dto);

      expect(result).toEqual(updatedUser);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        data: {
          name: 'Updated User',
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should throw NotFoundException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.update(999, { name: 'Updated User' }),
      ).rejects.toThrow(new NotFoundException('User not found'));

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when updating to an existing email', async () => {
      const existingUser = {
        id: 1,
        name: 'Existing User',
        email: 'user1@example.com',
        password: 'hash',
      };

      const emailUser = {
        id: 2,
        name: 'Another User',
        email: 'user2@example.com',
      };

      prisma.user.findUnique
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce(emailUser);

      await expect(
        service.update(1, {
          email: 'user2@example.com',
        }),
      ).rejects.toThrow(new ConflictException('Email already exists'));

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should hash the password when updating the password', async () => {
      const existingUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        password: 'old-hash',
      };

      const hashedPassword = 'new-hash';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      
      prisma.user.findUnique.mockResolvedValue(existingUser);

      prisma.user.update.mockResolvedValue({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.update(1, {
        password: 'new-password',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('new-password', 10);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        data: {
          password: hashedPassword,
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });
  });

  describe('remove', () => {
    it('should delete a user successfully', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
      });

      prisma.user.delete.mockResolvedValue({});

      const result = await service.remove(1);

      expect(result).toEqual({
        message: 'User deleted successfully',
      });

      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
    });

    it('should throw NotFoundException when deleting a non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        new NotFoundException('User not found'),
      );

      expect(prisma.user.delete).not.toHaveBeenCalled();
    });
  });
});