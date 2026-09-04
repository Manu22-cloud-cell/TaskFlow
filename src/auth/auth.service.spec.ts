import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { jest } from '@jest/globals';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    create: jest.fn(),
    findByEmailForAuth: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should create and return a user', async () => {
      const registerDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
      };

      const createdUser = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUsersService.create.mockResolvedValue(createdUser);

      const result = await service.register(registerDto);

      expect(mockUsersService.create).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(createdUser);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'john@example.com',
      password: 'password123',
    };

    it('should return access token and user for valid credentials', async () => {
      const hashedPassword = await bcrypt.hash(
        loginDto.password,
        10,
      );

      const user = {
        id: 1,
        name: 'John Doe',
        email: loginDto.email,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUsersService.findByEmailForAuth.mockResolvedValue(user);
      mockJwtService.signAsync.mockResolvedValue('mock-jwt-token');

      const result = await service.login(loginDto);

      expect(
        mockUsersService.findByEmailForAuth,
      ).toHaveBeenCalledWith(loginDto.email);

      expect(mockJwtService.signAsync).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
      });

      expect(result).toEqual({
        accessToken: 'mock-jwt-token',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });

      expect(result).not.toHaveProperty('user.password');
      
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      mockUsersService.findByEmailForAuth.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );

      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      const hashedPassword = await bcrypt.hash(
        'different-password',
        10,
      );

      const user = {
        id: 1,
        name: 'John Doe',
        email: loginDto.email,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUsersService.findByEmailForAuth.mockResolvedValue(user);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );

      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });
  });
});