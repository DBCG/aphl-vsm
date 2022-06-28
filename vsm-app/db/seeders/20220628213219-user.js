'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Users', [
      {
        firstName: 'Sample',
        lastName: 'User',
        email: 'demo@example.com',
        isAdmin: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        firstName: 'Sample2',
        lastName: 'User2',
        email: 'demo2@example.com',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Users', null, {});
  }
};
