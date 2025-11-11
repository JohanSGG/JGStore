  // jgstore-backend/models/InvoiceModel.js
  const { DataTypes } = require('sequelize');
  const sequelize = require('../config/db');
  const OrderModel = require('./OrderModel');

  const Invoice = sequelize.define('Invoice', {
      id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
      },
      order_id: {
          type: DataTypes.INTEGER,
          references: { model: OrderModel, key: 'id' },
          unique: true
      },
      invoice_date: {
          type: DataTypes.DATEONLY,
          allowNull: false
      },
      billing_address: {
          type: DataTypes.TEXT
      },
      total: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false
      }
  }, {
      tableName: 'invoices',
      timestamps: false
  });

  Invoice.belongsTo(OrderModel, { foreignKey: 'order_id' });

  module.exports = Invoice;
  