const config = require('../config');

function hasRoleNamed(member, roleName) {
  if (!member || !member.roles) return false;
  return member.roles.cache.some((r) => r.name.toLowerCase() === roleName.toLowerCase());
}

function isStaffOrOwner(member) {
  if (!member) return false;
  if (member.permissions?.has?.('Administrator')) return true;
  return hasRoleNamed(member, config.STAFF_ROLE_NAME) || hasRoleNamed(member, config.OWNER_ROLE_NAME);
}

function isOwner(member) {
  if (!member) return false;
  if (member.permissions?.has?.('Administrator')) return true;
  return hasRoleNamed(member, config.OWNER_ROLE_NAME);
}

module.exports = { hasRoleNamed, isStaffOrOwner, isOwner };
