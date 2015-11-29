'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.createTable(
        'Bills',
        {
          id: {
            allowNull: false,
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          userId: {
            type: Sequelize.INTEGER,
            field: 'user_id',
            references: 'Users',
            referencesKey: 'id'
          },
          currencyId: {
            type: Sequelize.INTEGER,
            field: 'currency_id',
            references: 'Currencies',
            referencesKey: 'id'
          },
          balance: {
            type: Sequelize.NUMERIC
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE
          }
        }
    );
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.dropTable('Bills');
  }
};
