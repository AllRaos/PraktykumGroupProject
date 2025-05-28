import {Sequelize} from 'sequelize';

export const sequelize = new Sequelize('practice', 'root', 'qwerty12345678', {
  host: 'localhost',
  dialect: 'mysql',
});