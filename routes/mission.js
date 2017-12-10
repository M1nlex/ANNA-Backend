/* eslint new-cap: 0*/

'use strict';

const router = require('express').Router();
const missionController = require('../controllers/mission_controller');

router.route('/')
    .get(missionController.index)
    .post(missionController.store);

router.route('/:missionId([0-9]+)')
    .get(missionController.show)
    .put(missionController.update)
    .delete(missionController.delete);

module.exports = router;
