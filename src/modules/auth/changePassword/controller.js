'use strict';

let joi = require('joi');
const bcrypt = require('bcrypt');

const findRoot = require('find-root');
const root = findRoot(__dirname);
const path = require('path');

const config = require(path.join(root, './src/config/config'));

let schema = joi.object().keys({
    oldPassword: joi.string().required(),
    newPassword1: joi.string().required(),
    newPassword2: joi.string().required(),
})


module.exports = function (db) {

    return async (req, res) => {
        // Validate user input
        req.transaction.logger.info('Validating schema');
        const validation = joi.validate(req.body, schema);
        if (validation.error) {
            req.transaction.logger.info('Schema validation failed', {error : validation.error})
            return res.boom.badRequest(validation.error);
        }

        console.log('ligne 28');

        // Find the corresponding UserSecret
        let user = await req.transaction.db.User.findByPk(req.transaction.info.userId);
        if(!user) { return res.boom.badImplementation("Couldn't find user"); }

        console.log('ligne 36');

        let secret = await user.getSecrets();
        if(!secret) { return res.boom.badImplementation("Couldn't find user secrets"); }

        console.log('ligne 41');

        // Compare password to hash
        req.transaction.logger.debug('Comparing hashes');
        const passwordAccepted = await bcrypt.compare(req.body.oldPassword, secret.password);
        if (!passwordAccepted) { return res.boom.badRequest("Old password is wrong"); }

        console.log('ligne 48');

        if(req.body.newPassword1 != req.body.newPassword2) { return res.boom.badRequest(); }

        console.log('ligne 52');

        await secret.update({password: req.body.newPassword1});

        console.log('ligne 56');

        return res.status(200).json({});
    };
};