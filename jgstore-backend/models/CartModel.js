  // jgstore-backend/models/CartModel.js
  const { DataTypes } = require('sequelize');
  const sequelize = require('../config/db');
  const UserModel = require('./User Model');
  const ProductModel = require('./ProductModel');

  const Cart = sequelize.define('Cart', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      references: { model: UserModel, key: 'id' }
    },
    product_id: {
      type: DataTypes.INTEGER,
      references: { model: ProductModel, key: 'id' }
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false
    }
  }, {
    tableName: 'cart',
    timestamps: true,
    indexes: [{ unique: true, fields: ['user_id', 'product_id'] }]
  });

  Cart.belongsTo(UserModel, { foreignKey: 'user_id' });
  Cart.belongsTo(ProductModel, { foreignKey: 'product_id' });

  module.exports = Cart;
  