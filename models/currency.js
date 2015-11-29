'use strict';
module.exports = function(sequelize, DataTypes) {
  var Currency = sequelize.define('Currency', {
    title: DataTypes.STRING,
    code: DataTypes.STRING(4)
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return Currency;
};
