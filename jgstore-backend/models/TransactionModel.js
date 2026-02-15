  // jgstore-backend/models/TransactionModel.js
  const { DataTypes } = require('sequelize');
  const sequelize = require('../config/db');  // Asume config/db exporta sequelize instance (ajusta si es pool)
  const OrderModel = require('./OrderModel');  // Asume existe

  const Transaction = sequelize.define('Transaction', {
      id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
      },
      order_id: {
          type: DataTypes.INTEGER,
          references: { model: OrderModel, key: 'id' }
      },
      payment_method_id: {
          type: DataTypes.INTEGER,
          allowNull: true
      },
      amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false
      },
      status: {
          type: DataTypes.ENUM('exitoso', 'fallido', 'pendiente'),
          defaultValue: 'pendiente'
      },
      transaction_date: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW
      }
  }, {
      tableName: 'transactions',
      timestamps: false 
  });

  Transaction.belongsTo(OrderModel, { foreignKey: 'order_id' });

  module.exports = Transaction;
  