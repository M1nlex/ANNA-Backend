'use strict';

const policy = require('../storage_policy');

/**
 *
 * Upload a new file.
 *
 * @param {Object} req - The user request.
 * @param {Object} res - The response to be sent.
 *
 * @returns {Object} Promise.
 *
 */

module.exports = (db) => async (req, res) => {
    let start = process.hrtime();


    /*
     * ATTENTION : NO INPUT VALIDATION !
     * (Integer checking for dirId/groupId)
     */

    // Escape req.body strings
    Object.keys(req.body).map((key) => {
        if (typeof req.body[key] === 'string') {
            req.body[key] = encodeURI(req.body[key]);
        }

        return true;
    });

    // Check folderId
    if(isNaN(parseInt(req.body.dirId, 10))) {
        return res.boom.badRequest('dirId must be an integer');
    }

    // Create the file and its data
    const allowed = await policy.filterUploadNew(db, req.body.dirId, req.session.auth);

    if (!allowed) {
        throw res.boom.unauthorized();
    }

    let filePath = '';

    if (req.file) {
        filePath = req.file.path;
    }

    const data = await db.File.createNew(db, req.body, filePath, req.session.auth);

    let end = process.hrtime()

    let start_ns = start[0] * 1000000 + start[1] / 1000
    let end_ns = end[0] * 1000000 + end[1] / 1000;
    console.log("Upload processing time : ", end_ns-start_ns, " ns = ", (end_ns-start_ns)/1000, " ms");

    return res.status(200).json(data);
};
