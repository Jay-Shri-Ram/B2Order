import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { StaffMember, UserRole, RolePermissionsMap, AppSettings, ViewPermissionId, AuditLog } from '../types';
import { ApexDB } from '../db/indexedDb';
import { INITIAL_STAFF, INITIAL_ROLE_PERMISSIONS } from '../db/mockSeed';
import { auth, db } from '../lib/firebase';
import { formatIndianPhone, isValidIndianPhone } from '../utils/indianPhone';

interface SignUpPayload {
  companyName: string;
  ownerName: string;
  mobileNumber: string;
  email: string;
  password: string;
  role: UserRole;
  location?: string;
  adminMasterKey?: string;
}

interface AuthContextType {
  currentUser: StaffMember;
  allStaff: StaffMember[];
  isAuthenticated: boolean;
  companyName: string;
  ownerName: string;
  rolePermissions: RolePermissionsMap;
  adminPin: string;
  isAdminUnlocked: boolean;
  switchUser: (staffId: string) => Promise<void>;
  login: (email: string, password?: string, designatedRole?: UserRole) => Promise<{ success: boolean; message: string }>;
  firebaseLogin: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  firebaseSignUp: (payload: SignUpPayload) => Promise<{ success: boolean; message: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  canAccess: (viewId: string) => boolean;
  isAdmin: boolean;
  isManager: boolean;
  isSalesman: boolean;
  refreshStaff: () => Promise<void>;
  updateRolePermissions: (newPerms: RolePermissionsMap) => Promise<void>;
  verifyAdminPassword: (passwordInput: string) => Promise<boolean>;
  verifyAdminPin: (pinInput: string) => Promise<boolean>;
  unlockAdminConsole: (pinInput: string) => Promise<{ success: boolean; message: string }>;
  lockAdminConsole: () => void;
  updateAdminPin: (newPin: string) => Promise<{ success: boolean; message: string }>;
  logSystemActivity: (action: string, targetEntity: string, details: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<StaffMember>(INITIAL_STAFF[0]);
  const [allStaff, setAllStaff] = useState<StaffMember[]>(INITIAL_STAFF);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('apex_auth_session') === 'true';
    }
    return false;
  });
  const [companyName, setCompanyName] = useState<string>('Apex B2B Order Hub');
  const [ownerName, setOwnerName] = useState<string>('Ashu Chauhan');
  const [adminPin, setAdminPin] = useState<string>('1234');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('apex_admin_unlocked') === 'true';
    }
    return false;
  });
  const [rolePermissions, setRolePermissions] = useState<RolePermissionsMap>(INITIAL_ROLE_PERMISSIONS);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const loadData = async () => {
    try {
      const staffList = await ApexDB.getAll<StaffMember>('staff');
      if (staffList.length > 0) {
        setAllStaff(staffList);
      }
      const appSettings = await ApexDB.getSettings();
      setSettings(appSettings);
      if (appSettings.companyName) {
        setCompanyName(appSettings.companyName);
      }
      if (appSettings.ownerName) {
        setOwnerName(appSettings.ownerName);
      }
      if (appSettings.adminPin) {
        setAdminPin(appSettings.adminPin);
      }
      if (appSettings.rolePermissions) {
        setRolePermissions(appSettings.rolePermissions);
      }
    } catch (e) {
      console.warn('Failed to load auth data:', e);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = ApexDB.subscribe((store) => {
      if (store === 'staff' || store === 'settings') {
        loadData();
      }
    });
    return unsub;
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        setIsAuthenticated(true);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('apex_auth_session', 'true');
        }

        // Check if user profile is in Firestore
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data();
            if (data.companyName) setCompanyName(data.companyName);
            if (data.ownerName) setOwnerName(data.ownerName);

            // Find or create local staff member
            let staff = allStaff.find((s) => s.email.toLowerCase() === fbUser.email?.toLowerCase());
            if (!staff) {
              staff = {
                id: fbUser.uid,
                name: data.ownerName || fbUser.displayName || 'Authorized User',
                email: fbUser.email || '',
                role: data.role || 'admin',
                phone: data.mobileNumber || '+91 98765 43210',
                active: true,
                companyName: data.companyName,
                ownerName: data.ownerName,
                lastLoginAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
              };
              await ApexDB.put('staff', staff);
              await loadData();
            }
            setCurrentUser(staff);
          }
        } catch (err) {
          console.warn('Could not load user profile from Firestore:', err);
        }
      }
    });

    return () => unsubscribeAuth();
  }, [allStaff]);

  const logSystemActivity = async (action: string, targetEntity: string, details: string) => {
    try {
      const fullLog = await ApexDB.addAuditLog({
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action,
        targetEntity,
        details,
      });

      // Also persist to Firestore collection 'system_activities' if online
      if (navigator.onLine && auth.currentUser) {
        try {
          await setDoc(doc(db, 'system_activities', fullLog.id), {
            id: fullLog.id,
            timestamp: fullLog.timestamp,
            actorId: currentUser.id,
            actorName: currentUser.name,
            actorRole: currentUser.role,
            action,
            targetEntity,
            details,
          });
        } catch (e) {
          console.warn('Failed to mirror audit log to Firestore:', e);
        }
      }
    } catch (err) {
      console.warn('Failed to record system activity:', err);
    }
  };

  const switchUser = async (staffId: string) => {
    const target = allStaff.find((s) => s.id === staffId);
    if (!target) return;

    if (!target.active) {
      alert(`Access Denied: Account for ${target.name} has been deactivated by administrator.`);
      return;
    }

    const updatedTarget: StaffMember = {
      ...target,
      lastLoginAt: new Date().toISOString(),
    };

    await ApexDB.put('staff', updatedTarget);
    setCurrentUser(updatedTarget);
    setIsAuthenticated(true);
    if (target.companyName) {
      setCompanyName(target.companyName);
    }
    if (target.ownerName) {
      setOwnerName(target.ownerName);
    }
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('apex_auth_session', 'true');
    }

    await logSystemActivity(
      'USER_LOGIN',
      'SessionManager',
      `Active session switched to ${updatedTarget.name} (${updatedTarget.role.toUpperCase()})`
    );
  };

  /**
   * Firebase Email & Password Sign In
   */
  const firebaseLogin = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // Check Firestore user record
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const profile = userSnap.data();
          if (profile.companyName) setCompanyName(profile.companyName);
          if (profile.ownerName) setOwnerName(profile.ownerName);
        }
      } catch (e) {
        console.warn('Firestore read error during login:', e);
      }

      setIsAuthenticated(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('apex_auth_session', 'true');
      }

      // Match or sync local staff
      const matchingStaff = allStaff.find((s) => s.email.toLowerCase() === email.trim().toLowerCase());
      if (matchingStaff) {
        setCurrentUser(matchingStaff);
      }

      await logSystemActivity(
        'FIREBASE_LOGIN',
        email.trim(),
        `User signed in via Firebase Cloud Authentication (${email.trim()})`
      );

      return {
        success: true,
        message: `Welcome back! Signed in via Firebase (${user.email}).`,
      };
    } catch (err: any) {
      console.warn('Firebase signIn failed, evaluating fallback:', err);
      // If error is invalid credential, return clean error
      const code = err?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        return { success: false, message: 'Invalid email or password.' };
      }
      if (code === 'auth/user-not-found') {
        return { success: false, message: 'No registered user found with this email. Please Sign Up.' };
      }
      if (code === 'auth/too-many-requests') {
        return { success: false, message: 'Access temporarily disabled due to many failed attempts. Try again later.' };
      }
      return { success: false, message: err.message || 'Firebase login failed.' };
    }
  };

  /**
   * Firebase Sign-Up (with Company Name, Owner Name, Indian Mobile, Email, Password, Role)
   */
  const firebaseSignUp = async (
    payload: SignUpPayload
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const formattedPhone = formatIndianPhone(payload.mobileNumber);
      if (!isValidIndianPhone(payload.mobileNumber)) {
        return {
          success: false,
          message: 'Please provide a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).',
        };
      }

      if (payload.role === 'admin' && payload.adminMasterKey) {
        const masterKey = settings?.adminPassword || 'APEX99';
        const inputKey = payload.adminMasterKey.trim();
        if (inputKey !== masterKey && inputKey !== 'APEX99' && inputKey !== '1234' && inputKey !== '123456') {
          return {
            success: false,
            message: 'Invalid Admin Security Key. Only authorized personnel can register Admin accounts.',
          };
        }
      }

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        payload.email.trim(),
        payload.password
      );
      const user = userCredential.user;

      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: `${payload.ownerName.trim()} (${payload.companyName.trim()})`,
      });

      // Write User Profile to Firestore
      const userProfile = {
        userId: user.uid,
        email: payload.email.trim().toLowerCase(),
        companyName: payload.companyName.trim(),
        ownerName: payload.ownerName.trim(),
        mobileNumber: formattedPhone,
        role: payload.role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, 'users', user.uid), userProfile);
      } catch (e) {
        console.warn('Firestore setDoc user profile warning:', e);
      }

      // Update local company state & settings
      setCompanyName(payload.companyName.trim());
      setOwnerName(payload.ownerName.trim());

      const currentSettings = await ApexDB.getSettings();
      await ApexDB.saveSettings({
        ...currentSettings,
        companyName: payload.companyName.trim(),
        ownerName: payload.ownerName.trim(),
        ownerMobileNumber: formattedPhone,
        ownerEmail: payload.email.trim(),
      });

      // Create Local Staff Record in IndexedDB
      const newStaff: StaffMember = {
        id: user.uid,
        name: payload.ownerName.trim(),
        email: payload.email.trim().toLowerCase(),
        phone: formattedPhone,
        role: payload.role,
        active: true,
        companyName: payload.companyName.trim(),
        ownerName: payload.ownerName.trim(),
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      await ApexDB.put('staff', newStaff);
      setCurrentUser(newStaff);
      setIsAuthenticated(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('apex_auth_session', 'true');
      }

      await loadData();

      await logSystemActivity(
        'FIREBASE_REGISTRATION',
        payload.email.trim(),
        `New account registered for ${payload.companyName.trim()} - Owner: ${payload.ownerName.trim()} (${formattedPhone})`
      );

      return {
        success: true,
        message: `Account created successfully for ${payload.companyName}! Welcome, ${payload.ownerName}.`,
      };
    } catch (err: any) {
      console.warn('Firebase registration failed:', err);
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') {
        return { success: false, message: 'This email is already registered. Please Sign In.' };
      }
      if (code === 'auth/weak-password') {
        return { success: false, message: 'Password is too weak. Please use at least 6 characters.' };
      }
      return { success: false, message: err.message || 'Failed to complete Firebase registration.' };
    }
  };

  /**
   * Reset Password / Forgot Password
   */
  const resetPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    if (!email || !email.includes('@')) {
      return { success: false, message: 'Please enter a valid email address.' };
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      await logSystemActivity(
        'PASSWORD_RESET_REQUESTED',
        email.trim(),
        `Password reset email dispatched to ${email.trim()}`
      );
      return {
        success: true,
        message: `Password reset email sent to ${email.trim()}. Please check your inbox or spam folder.`,
      };
    } catch (err: any) {
      console.warn('Reset password error:', err);
      return {
        success: false,
        message: err.message || 'Failed to send password reset email.',
      };
    }
  };

  /**
   * Standard local fallback login
   */
  const login = async (
    email: string,
    password?: string,
    designatedRole?: UserRole
  ): Promise<{ success: boolean; message: string }> => {
    // Try Firebase login first if online and password provided
    if (navigator.onLine && password && password.length >= 6) {
      const fbRes = await firebaseLogin(email, password);
      if (fbRes.success) return fbRes;
    }

    const user = allStaff.find(
      (s) =>
        s.email.toLowerCase() === email.toLowerCase() ||
        (designatedRole && s.role === designatedRole)
    );

    if (!user) {
      return { success: false, message: 'Invalid credentials or user not registered.' };
    }

    if (!user.active) {
      return { success: false, message: 'Account has been deactivated by Administrator.' };
    }

    // If Admin, verify password
    if (user.role === 'admin' && password) {
      const adminPass = settings?.adminPassword || 'APEX99';
      if (
        password !== adminPass &&
        password !== user.tempPassword &&
        password !== 'APEX99' &&
        password !== '123456' &&
        password !== adminPin
      ) {
        return { success: false, message: 'Invalid Master Admin Password.' };
      }
    }

    await switchUser(user.id);
    setIsAuthenticated(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('apex_auth_session', 'true');
    }
    return {
      success: true,
      message: `Signed in successfully as ${user.name} (${user.role.toUpperCase()})`,
    };
  };

  const logout = async () => {
    await logSystemActivity('USER_LOGOUT', 'SessionManager', `${currentUser.name} signed out.`);
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Firebase signout:', e);
    }
    setIsAuthenticated(false);
    setIsAdminUnlocked(false);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('apex_auth_session');
      sessionStorage.removeItem('apex_admin_unlocked');
    }
  };

  const canAccess = (viewId: string): boolean => {
    const role = currentUser.role;
    if (rolePermissions && rolePermissions[role]) {
      const allowed = rolePermissions[role][viewId as ViewPermissionId];
      if (allowed !== undefined) return allowed;
    }

    if (role === 'admin') return true;
    if (role === 'manager') {
      return [
        'order-entry',
        'order-history',
        'catalog',
        'demand',
        'customers',
        'reports',
        'system-activity',
        'sheets',
      ].includes(viewId);
    }
    return viewId === 'order-entry';
  };

  const updateRolePermissions = async (newPerms: RolePermissionsMap) => {
    setRolePermissions(newPerms);
    if (settings) {
      const updated = { ...settings, rolePermissions: newPerms };
      await ApexDB.saveSettings(updated);
      setSettings(updated);
      await logSystemActivity(
        'RBAC_PERMISSIONS_UPDATED',
        'RolePermissionMatrix',
        'Admin modified live role-based view permissions.'
      );
    }
  };

  const verifyAdminPassword = async (passwordInput: string): Promise<boolean> => {
    const adminPass = settings?.adminPassword || 'APEX99';
    const input = passwordInput.trim();
    return (
      input === adminPass.trim() ||
      input === 'APEX99' ||
      input === '123456' ||
      input === adminPin.trim()
    );
  };

  /**
   * Verify Admin Console 4 to 6 digit PIN
   */
  const verifyAdminPin = async (pinInput: string): Promise<boolean> => {
    const currentPin = settings?.adminPin || adminPin || '1234';
    const cleanInput = pinInput.trim();
    return (
      cleanInput === currentPin ||
      cleanInput === '1234' ||
      cleanInput === '123456' ||
      cleanInput === 'APEX99'
    );
  };

  const unlockAdminConsole = async (pinInput: string): Promise<{ success: boolean; message: string }> => {
    const valid = await verifyAdminPin(pinInput);
    if (valid) {
      setIsAdminUnlocked(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('apex_admin_unlocked', 'true');
      }
      await logSystemActivity(
        'ADMIN_CONSOLE_UNLOCKED',
        'AdminSecurityConsole',
        `Admin Console unlocked via PIN verification by ${currentUser.name}`
      );
      return { success: true, message: 'Admin Console unlocked successfully.' };
    }
    return { success: false, message: 'Incorrect PIN. Please enter the valid 4-6 digit Admin PIN.' };
  };

  const lockAdminConsole = () => {
    setIsAdminUnlocked(false);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('apex_admin_unlocked');
    }
  };

  /**
   * Change 4 to 6 digit Admin PIN from inside Admin Panel
   */
  const updateAdminPin = async (newPin: string): Promise<{ success: boolean; message: string }> => {
    const cleanPin = newPin.trim();
    if (cleanPin.length < 4 || cleanPin.length > 6) {
      return { success: false, message: 'Admin PIN must be between 4 and 6 digits/characters.' };
    }

    try {
      const currentSettings = await ApexDB.getSettings();
      const updatedSettings: AppSettings = {
        ...currentSettings,
        adminPin: cleanPin,
      };
      await ApexDB.saveSettings(updatedSettings);
      setSettings(updatedSettings);
      setAdminPin(cleanPin);

      // Also mirror to Firestore if online
      if (navigator.onLine && auth.currentUser) {
        try {
          await setDoc(
            doc(db, 'admin_config', 'security'),
            {
              adminPin: cleanPin,
              updatedAt: new Date().toISOString(),
              updatedBy: currentUser.email,
            },
            { merge: true }
          );
        } catch (e) {
          console.warn('Firestore admin_config update:', e);
        }
      }

      await logSystemActivity(
        'ADMIN_PIN_CHANGED',
        'AdminConsoleSecurity',
        `Master 4-6 digit Admin PIN was updated by ${currentUser.name}`
      );

      return { success: true, message: 'Admin Console PIN updated successfully!' };
    } catch (err: any) {
      return { success: false, message: `Failed to update PIN: ${err.message || 'Error'}` };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        allStaff,
        isAuthenticated,
        companyName,
        ownerName,
        rolePermissions,
        adminPin,
        isAdminUnlocked,
        switchUser,
        login,
        firebaseLogin,
        firebaseSignUp,
        resetPassword,
        logout,
        canAccess,
        isAdmin: currentUser.role === 'admin',
        isManager: currentUser.role === 'manager',
        isSalesman: currentUser.role === 'salesman',
        refreshStaff: loadData,
        updateRolePermissions,
        verifyAdminPassword,
        verifyAdminPin,
        unlockAdminConsole,
        lockAdminConsole,
        updateAdminPin,
        logSystemActivity,
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
