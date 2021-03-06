var models  = require('../models');
var express = require('express');
var router = express.Router();
var sequelize = models.sequelize;

// Проверка авторизации пользователя
var isAuthenticated = function (req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
};

// Получение страницы открытия лицевого счета
router.get('/create', isAuthenticated, function(req, res) {
    models.Currency.findAll().then(function(currencies) {
        res.render('billing/create', {
            message: req.flash('message'),
            currencies: currencies
        });
    });
});

// Обработка POST-данных открытия счета
router.post('/create', isAuthenticated, function(req, res) {
    if (isNaN(req.body.balance) || req.body.balance < 0) {
        req.flash('message', 'Invalid value. Try again');
        return res.redirect('/billing/create');
    }
    models.Bill.create({
        userId: req.user.id,
        balance: req.body.balance,
        currencyId: req.body.currency_id
    }).then(function(bill) {
        if (!bill) {
            req.flash('message','Error');
        }
        res.redirect('/');
    });
});

// Получение страницы изменения лицевого счета
router.get('/:id', isAuthenticated, function(req, res) {
    models.Bill.findOne({
        where: {id: req.params.id, userId: req.user.id},
        include: [
            { model: models.Currency }
        ]
    }).then(function(bill) {
        res.render('billing/bill', {
            user: req.user,
            bill: bill,
            message: req.flash('message')
        });
    });
});

// Обработка POST-данных изменения счета (пополнение и списание)
router.post('/:id', isAuthenticated, function(req, res) {
    models.Bill.findOne({
        where: {id: req.params.id, userId: req.user.id}
    }).then(function(bill) {
        if (!isNaN(req.body.credit) && req.body.credit > 0) {
            bill.increment({ balance: req.body.credit }).then(
                function() {
                    res.redirect('/');
                }
            );
        } else if (!isNaN(req.body.debit) && req.body.debit > 0) {
            bill.decrement({ balance: req.body.debit }).then(
                function() {
                    res.redirect('/');
                }
            ).catch(
                function (err) {
                    req.flash('message', 'Error');
                    res.redirect('/billing/' + req.params.id);
                }
            );
        } else {
            req.flash('message', 'Invalid value');
            return res.redirect('/billing/' + req.params.id);
        }
    });
});

// Получение списка счетов для перевода
router.get('/:id/transfer', isAuthenticated, function(req, res) {
    models.Bill.findAll({
        where: {
            userId: req.user.id,
            id: {
                $ne: req.params.id
            },
            balance: {
                $gt: 0
            }
        },
        include: [
            { model: models.Currency }
        ]
    }).then(function(bills) {
        res.render('billing/transfer', {
            user: req.user,
            billId: req.params.id,
            bills: bills,
            message: req.flash('message')
        });
    });
});

// Обработка POST-данных авторизации переводов со счета на счет
router.post('/:id/transfer', isAuthenticated, function(req, res) {
    if (isNaN(req.body.transfer) || req.body.transfer <= 0) {
        req.flash('message', 'Invalid value');
        return res.redirect('/billing/' + req.params.id + '/transfer');
    }
    var transfer = req.body.transfer;
    return models.Bill.findOne({
        where: {
            userId: req.user.id,
            id: req.body.bill_id
        }
    }).then(
        function(billFrom) {
            models.Bill.findOne({
                where: {
                    userId: req.user.id,
                    id: req.params.id
                }
            }).then(
                function(billTo) {
                    if (billFrom.currencyId == billTo.currencyId) {
                        sequelize.transaction({ autocommit: false }).then(function (t1) {
                            billTo.increment(
                                { balance: transfer },
                                { transaction: t1 }
                            ).then(
                                function () {
                                    billFrom.decrement(
                                        { balance: transfer },
                                        { transaction: t1 }
                                    ).then(
                                        function () {
                                            t1.commit();
                                            return res.redirect('/billing/' + billTo.id);
                                        }
                                    ).catch(
                                        function () {
                                            t1.rollback();
                                            req.flash('message', 'Not enough coins');
                                            return res.redirect('/billing/' + req.params.id + '/transfer');
                                        }
                                    );
                                }
                            )
                        });
                    } else {
                        models.CurrencyConverter.findOne({
                            where: {
                                fromCurrencyId: billFrom.currencyId,
                                toCurrencyId: billTo.currencyId
                            }
                        }).then(
                            function(convertItem) {
                                sequelize.transaction({ autocommit: false }).then(function (t2) {
                                    billTo.increment(
                                        { balance: (convertItem.rate * transfer) },
                                        { transaction: t2 }
                                    ).then(
                                        function () {
                                            billFrom.decrement(
                                                { balance: transfer },
                                                { transaction: t2 }
                                            ).then(
                                                function () {
                                                    t2.commit();
                                                    return res.redirect('/billing/' + billTo.id);
                                                }
                                            ).catch(
                                                function () {
                                                    t2.rollback();
                                                    req.flash('message', 'Not enough coins');
                                                    return res.redirect('/billing/' + req.params.id + '/transfer');
                                                }
                                            );
                                        }
                                    )
                                });
                            }
                        );
                    }
                }
            );
        }
    );
});

module.exports = router;
