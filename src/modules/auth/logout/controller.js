'use strict';



module.exports = () => (req, res) => {

    req.transaction.logger.info("Logout controller invoked");

    // Reset session data
    req.session.auth = null;
    req.session.save();

    req.transaction.logger.info("Logout successful");

    // Send response
    return res.status(200).json({});
};
