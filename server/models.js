import { DataTypes } from 'sequelize';
import { sequelize } from './conf.js';

export const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
  },
});

export const Recent = sequelize.define('Recent', {
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id',
    },
  },
  type: {
    type: DataTypes.STRING,
  },
  value: {
    type: DataTypes.STRING,
  },
});

export const UserAction = sequelize.define('UserAction', {
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id',
    },
  },
  actionType: {
    type: DataTypes.STRING,
  },
  actionValue: {
    type: DataTypes.STRING,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

export const UserFile = sequelize.define('UserFile', {
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id',
    },
  },
  filePath: {
    type: DataTypes.STRING,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});