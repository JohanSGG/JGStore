  // jgstore-backend/models/TrackingModel.js
  const { DataTypes } = require('sequelize');
  const sequelize = require('../config/db');
  const OrderModel = require('./OrderModel');

  const Tracking = sequelize.define('Tracking', {
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
      tracking_number: {
          type: DataTypes.STRING(100),
          unique: true,
          allowNull: false
      },
      status: {
          type: DataTypes.STRING(255),
          defaultValue: 'Pedido recibido'
      },
      last_updated: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
          onUpdate: DataTypes.NOW
      }
  }, {
      tableName: 'tracking',
      timestamps: false
  });

  Tracking.belongsTo(OrderModel, { foreignKey: 'order_id' });

  module.exports = Tracking;
  