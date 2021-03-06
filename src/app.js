'use strict';

const express = require('express'); // Web server
const bodyParser = require('body-parser'); // X-form-data decoder
const helmet = require('helmet');
const http = require('http');
const boom = require('express-boom'); // Exception handling
const morgan = require('morgan');
const fs = require('fs'); // File system
const path = require('path');
const config = require('./config/config');


require('express-async-errors');

require('dotenv').config();


const loadApp = (options = {}) => {

    let start = process.hrtime();
    if(!options) { exit(-1); }
    
    morgan.token('id', (req) => req.id.split('-')[0]);
    const app = express();
    const {host, port} = config.app.getConnection();
    
    if(!options.test && !options.noServ) { // Listen only when out of testing settings
        let server = http.createServer(app).listen(port, host, function () {
            if (!options.noLog) {
                console.log(`${config.app.name} v${config.app.version} listening on ${host}:${port}`);
                const elapsedHrTime = process.hrtime(start);
                const elapsed = elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6;
                console.log("Started in", elapsed, "ms");
            }

        });

        process.on('SIGINT', function() {
            console.log("\nCaught interrupt signal, exiting...");
            server.close(() => {
                console.log("All done !");
                process.exit(0);
            })
        });
    }

    app.use(boom()); // Error responses
    app.use(helmet()); // Helmet offers different protection middleware
    app.use(require('./middlewares/rate_limit')); // Rate limit
    app.use(bodyParser.urlencoded({extended: true})); // POST parser
    app.use(bodyParser.json());
    app.use(require('express-request-id')({setHeader: true})); // Unique ID for every request
    app.use(require('./middlewares/transaction')(options)); // Build transaction object
    app.use(require('./middlewares/timing'));
    if (!options.noLog) {
        app.use(morgan('[:date[iso] #:id] Started :method :url for :remote-addr', {immediate: true}));
        app.use(morgan('[:date[iso] #:id] Completed in :response-time ms (HTTP :status with length :res[content-length])'));
    }
    app.use(morgan('combined', {stream: fs.createWriteStream(path.join(__dirname, 'access.log'), {flags: 'a'})}));
    app.use(require('./middlewares/cors')); // CORS headers
    app.use(require('./middlewares/session')); // Session management
    app.use(require('./middlewares/auth')); // Auth check

    app.set('trust proxy', 1); // Trust reverse proxy
    app.options('*', require('./middlewares/cors'));    // Pre-flight

    const ModulesFactory = require('./modules');
    const factoryOptions = {test: options.test};
    const factory = new ModulesFactory(factoryOptions);

    app.use(factory.router);
    app.use(require('./middlewares/exception')); // Error handling

    return {
        app,
        modules: factory
    };
};

if (require.main === module) {
    loadApp();
} else {
    module.exports = loadApp;
}
