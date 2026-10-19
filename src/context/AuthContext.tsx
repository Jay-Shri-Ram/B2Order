import React, { createContext, useContext, useState, useEffect } from 'react';
import { StaffMember, UserRole } from '../types';
import { ApexDB } from '../db/indexedDb';
import { INITIAL_STAFF } from '../db/mockSeed';

interface AuthContextType {
  currentUser: StaffMember;
  allStaff: StaffMember[];
  switchUser: (staffId: string) => Promise<void>;
  login: (email: string, password?: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  canAccess: (viewId: string) => boolean;
  isAdmin: boolean;
  isManager: boolean;
  isSalesman: boolean;
  refreshStaff: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<StaffMember>(INITIAL_STAFF[0]); // Default to Alexander Wright (Admin)
  const [allStaff, setAllStaff] = useState<StaffMember[]>(INITIAL_STAFF);

  const refreshStaff = async () => {
    try {
      const staffList = await ApexDB.getAll<StaffMember>('staff');
      if (staffList.length > 0) {
        setAllStaff(staffList);
        // Ensure current user is still up to date with any active toggles
        const updatedCurrent = staffList.find((s) => s.id === currentUser.id);
        if (updatedCurrent) {
          setCurrentUser(updatedCurrent);
        }
      }
    } catch (e) {
      console.warn('Failed to load staff list:', e);
    }
  };

  useEffect(() => {
    refreshStaff();
    const unsub = ApexDB.subscribe((store) => {
      if (store === 'staff') {
        refreshStaff();
      }
    });
    return unsub;
  }, []);

  const switchUser = async (staffId: string) => {
    const target = allStaff.find((s) => s.id === staffId);
    if (!target) return;

    if (!target.active) {
      alert(`Access Denied: Account for ${target.name} has been marked INACTIVE by system administrator.`);
      await ApexDB.addAuditLog({
        actorId: target.id,
        actorName: target.name,
        actorRole: target.role,
        action: 'LOGIN_BLOCKED_INACTIVE',
        targetEntity: 'AuthSecurity',
        details: 'Attempted login to inactive account blocked by security policy.'
      });
      return;
    }

    const updatedTarget: StaffMember = {
      ...target,
      lastLoginAt: new Date().toISOString()
    };

    await ApexDB.put('staff', updatedTarget);
    setCurrentUser(updatedTarget);

    await ApexDB.addAuditLog({
      actorId: updatedTarget.id,
      actorName: updatedTarget.name,
      actorRole: updatedTarget.role,
      action: 'USER_LOGIN',
      targetEntity: 'StaffConsole',
      details: `Active session switched to ${updatedTarget.name} (${updatedTarget.role.toUpperCase()})`
    });
  };

  const login = async (email: string): Promise<{ success: boolean; message: string }> => {
    const user = allStaff.find((s) => s.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      await ApexDB.addAuditLog({
        actorId: 'anonymous',
        actorName: email,
        actorRole: 'salesman',
        action: 'FAILED_LOGIN_ATTEMPT',
        targetEntity: 'AuthSecurity',
        details: `Login attempt with unrecognized email: ${email}`
      });
      return { success: false, message: 'Invalid credentials. User not found.' };
    }

    if (!user.active) {
      await ApexDB.addAuditLog({
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role,
        action: 'LOGIN_BLOCKED_INACTIVE',
        targetEntity: 'AuthSecurity',
        details: `Blocked login attempt for deactivated employee ${user.name}`
      });
      return { success: false, message: 'Account has been deactivated by Administrator.' };
    }

    await switchUser(user.id);
    return { success: true, message: `Welcome back, ${user.name}!` };
  };

  const logout = async () => {
    await ApexDB.addAuditLog({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'USER_LOGOUT',
      targetEntity: 'StaffConsole',
      details: `User ${currentUser.name} signed out.`
    });
    // Fallback to salesman or first active staff
    const fallback = allStaff.find((s) => s.role === 'salesman' && s.active) || allStaff[0];
    setCurrentUser(fallback);
  };

  /**
   * 2-Tier / 3-Level Role-Based Access Control logic:
   * - Salesman: ONLY 'order-entry'
   * - Manager: 'order-entry', 'order-history', 'catalog', 'customers', 'demand' (NO staff, NO profit-analysis, NO security)
   * - Admin: ALL views
   */
  const canAccess = (viewId: string): boolean => {
    if (currentUser.role === 'admin') return true;

    if (currentUser.role === 'manager') {
      const allowedViews = ['order-entry', 'order-history', 'catalog', 'customers', 'demand'];
      return allowedViews.includes(viewId);
    }

    if (currentUser.role === 'salesman') {
      return viewId === 'order-entry';
    }

    return false;
  };

  const isAdmin = currentUser.role === 'admin';
  const isManager = currentUser.role === 'manager';
  const isSalesman = currentUser.role === 'salesman';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        allStaff,
        switchUser,
        login,
        logout,
        canAccess,
        isAdmin,
        isManager,
        isSalesman,
        refreshStaff
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
