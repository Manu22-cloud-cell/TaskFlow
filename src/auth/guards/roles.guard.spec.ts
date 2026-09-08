import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { RolesGuard } from './roles.guard.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

describe('RolesGuard', () => {
    let guard: RolesGuard;

    const mockReflector = {
        getAllAndOverride: jest.fn(),
    };

    const createExecutionContext = (user?: {
        role?: UserRole;
    }) =>
        ({
            getHandler: jest.fn(),
            getClass: jest.fn(),
            switchToHttp: jest.fn().mockReturnValue({
                getRequest: jest.fn().mockReturnValue({
                    user,
                }),
            }),
        }) as any;

    beforeEach(() => {
        jest.clearAllMocks();


        guard = new RolesGuard(
            mockReflector as unknown as Reflector,
        );

    });

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    it('should allow access when no roles are required', () => {
        mockReflector.getAllAndOverride.mockReturnValue(undefined);


        const context = createExecutionContext({
            role: UserRole.MEMBER,
        });

        expect(guard.canActivate(context)).toBe(true);

        expect(
            mockReflector.getAllAndOverride,
        ).toHaveBeenCalledWith(
            ROLES_KEY,
            [
                context.getHandler(),
                context.getClass(),
            ],
        );


    });

    it('should allow access when an empty roles array is returned', () => {
        mockReflector.getAllAndOverride.mockReturnValue([]);

        const context = createExecutionContext({
            role: UserRole.MEMBER,
        });

        expect(guard.canActivate(context)).toBe(true);

    });

    it('should allow ADMIN when ADMIN role is required', () => {
        mockReflector.getAllAndOverride.mockReturnValue([
            UserRole.ADMIN,
        ]);

        const context = createExecutionContext({
            role: UserRole.ADMIN,
        });

        expect(guard.canActivate(context)).toBe(true);


    });

    it('should allow MANAGER when MANAGER role is required', () => {
        mockReflector.getAllAndOverride.mockReturnValue([
            UserRole.MANAGER,
        ]);


        const context = createExecutionContext({
            role: UserRole.MANAGER,
        });

        expect(guard.canActivate(context)).toBe(true);


    });

    it('should allow MEMBER when MEMBER role is required', () => {
        mockReflector.getAllAndOverride.mockReturnValue([
            UserRole.MEMBER,
        ]);

        const context = createExecutionContext({
            role: UserRole.MEMBER,
        });

        expect(guard.canActivate(context)).toBe(true);

    });

    it('should throw ForbiddenException when user does not have the required role', () => {
        mockReflector.getAllAndOverride.mockReturnValue([
            UserRole.ADMIN,
        ]);

        const context = createExecutionContext({
            role: UserRole.MEMBER,
        });

        expect(() => guard.canActivate(context)).toThrow(
            new ForbiddenException(
                'You do not have permission to access this resource',
            ),
        );


    });

    it('should throw ForbiddenException when user role is missing', () => {
        mockReflector.getAllAndOverride.mockReturnValue([
            UserRole.ADMIN,
        ]);

        const context = createExecutionContext({});

        expect(() => guard.canActivate(context)).toThrow(
            new ForbiddenException('User role is required'),
        );

    });

    it('should throw ForbiddenException when request user is missing', () => {
        mockReflector.getAllAndOverride.mockReturnValue([
            UserRole.ADMIN,
        ]);


        const context = createExecutionContext();

        expect(() => guard.canActivate(context)).toThrow(
            new ForbiddenException('User role is required'),
        );

    });

    it('should allow a role when multiple roles are permitted', () => {
        mockReflector.getAllAndOverride.mockReturnValue([
            UserRole.ADMIN,
            UserRole.MANAGER,
        ]);


        const context = createExecutionContext({
            role: UserRole.MANAGER,
        });

        expect(guard.canActivate(context)).toBe(true);

    });

    it('should deny a role when it is not included in the permitted roles', () => {
        mockReflector.getAllAndOverride.mockReturnValue([
            UserRole.ADMIN,
            UserRole.MANAGER,
        ]);

        const context = createExecutionContext({
            role: UserRole.MEMBER,
        });

        expect(() => guard.canActivate(context)).toThrow(
            new ForbiddenException(
                'You do not have permission to access this resource',
            ),
        );

    });
});
