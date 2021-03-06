'use strict';

process.env.TEST = true;

const test = require('ava');
const winston = require('winston');
const findRoot = require('find-root');
const root = findRoot(__dirname);
const path = require('path');
const bcrypt = require('bcrypt');
const config = require(path.join(root, "src", "config", "config.js"));

test.beforeEach(async t => {
    const loadApp = require(path.join(root, 'src', './app'));
    let {app, modules} = loadApp({test: true, noLog: true, testfile: __filename});
    const request = require('supertest').agent(app);

    const db = await modules.syncDB();

    t.context.app = app;
    t.context.db = db;
    t.context.request = request;

    t.context.user = await db.User.create({
        username: 'login_test',
        password: 'password_test',
        email: 'test@test.com'
    });

    await db.UserSecrets.create({
        userId: t.context.user.id,
        password: await bcrypt.hash('password_test', config.password.salt)
    });
})

test('Login, logout, check', async t => {
    
    // LOGIN
    let SuccessRes = await t.context.request.post('/auth/login')
        .send({
            username: 'login_test',
            password: 'password_test'
        })

    t.is(SuccessRes.status, 200);

    // CHECK LOGIN
    let res = await t.context.request.get('/auth/check')
    t.is(res.status, 200);
    t.is(res.body.logged, true);

    // TRY BAD LOGIN
    let badPasswordRes = await t.context.request.post('/auth/login')
        .send({
            username: 'login_test',
            password: 'qlmdkgsfk'
        })

    t.is(badPasswordRes.status, 401)

    let badUserRes = await t.context.request.post('/auth/login')
        .send({
            username: 'login_test8',
            password: 'password_test'
        })

    t.true(badUserRes.status == 401)

    // LOGOUT
    let res2 = await t.context.request.get('/auth/logout')
    t.is(res2.status, 200);

    // CHECK LOGOUT
    let res3 = await t.context.request.get('/auth/check')
    t.is(res3.status, 200);
    t.is(res3.body.logged, false);
});

test("Get token, check it and reset password", async t => {
    let tokenReq = await t.context.request.post('/auth/getToken').send({ email : 'test@test.com' });
    t.is(tokenReq.status, 200);
    t.is("token" in tokenReq.body, true);


});

test("Change own password", async t => {
    // LOGIN
    let SuccessRes = await t.context.request.post('/auth/login')
        .send({
            username: 'login_test',
            password: 'password_test'
        })
    t.is(SuccessRes.status, 200);

    let chgRes = await t.context.request.post('/auth/changePassword')
        .send({
            oldPassword: 'password_test',
            newPassword1: 'abcdef',
            newPassword2: 'abcdef'
        });
    t.is(chgRes.status, 200);

    // LOGOUT
    let res2 = await t.context.request.get('/auth/logout')
    t.is(res2.status, 200);

    // LOGIN
    let SuccessRes2 = await t.context.request.post('/auth/login')
        .send({
            username: 'login_test',
            password: 'abcdef'
        });

    console.error(SuccessRes2.body);
    t.is(SuccessRes2.status, 200);
});