// User Roles Enum
const UserRoles = {
  USER: 'USER',
  DRIVER: 'DRIVER',
  ADMIN: 'ADMIN'
};

// Role Permissions
const RolePermissions = {
  [UserRoles.USER]: [
    'create_delivery',
    'view_own_deliveries',
    'update_own_profile',
    'track_delivery',
    'contact_driver',
    'report_dispute'
  ],
  [UserRoles.DRIVER]: [
    'view_deliveries',
    'accept_delivery',
    'update_location',
    'update_delivery_status',
    'view_own_profile',
    'update_own_profile',
    'upload_kyc_documents',
    'contact_customer',
    'report_dispute'
  ],
  [UserRoles.ADMIN]: [
    'view_all_users',
    'view_all_drivers',
    'view_all_deliveries',
    'manage_users',
    'manage_drivers',
    'manage_deliveries',
    'manage_kyc',
    'manage_disputes',
    'view_analytics',
    'system_settings'
  ]
};

// Check if user has permission
const hasPermission = (userRole, permission) => {
  const userPermissions = RolePermissions[userRole] || [];
  return userPermissions.includes(permission);
};

// Check if user has any of the specified permissions
const hasAnyPermission = (userRole, permissions) => {
  const userPermissions = RolePermissions[userRole] || [];
  return permissions.some(permission => userPermissions.includes(permission));
};

// Check if user has all of the specified permissions
const hasAllPermissions = (userRole, permissions) => {
  const userPermissions = RolePermissions[userRole] || [];
  return permissions.every(permission => userPermissions.includes(permission));
};

// Get user permissions
const getUserPermissions = (userRole) => {
  return RolePermissions[userRole] || [];
};

// Check if role is valid
const isValidRole = (role) => {
  return Object.values(UserRoles).includes(role);
};

// Get all roles
const getAllRoles = () => {
  return Object.values(UserRoles);
};

// Get role display name
const getRoleDisplayName = (role) => {
  const displayNames = {
    [UserRoles.USER]: 'User',
    [UserRoles.DRIVER]: 'Driver',
    [UserRoles.ADMIN]: 'Administrator'
  };
  return displayNames[role] || role;
};

module.exports = {
  UserRoles,
  RolePermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getUserPermissions,
  isValidRole,
  getAllRoles,
  getRoleDisplayName
};