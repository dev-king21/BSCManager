const jwt = require('express-jwt');
const { secret } = require('config.json');
const db = require('_helpers/db');

module.exports = authorize;

function authorize() {

    return [
        // authenticate JWT token and attach decoded token to request as req.user
        jwt({ secret, algorithms: ['HS256'] }),

        // attach full user record to request object
        async (err,req, res, next) => {
            // get user with id from token 'sub' (subject) property
            if (err) return res.status(err.status).json(err);
            const user = await db.User.findByPk(req.user.sub);
            console.log('user selected', user);


            // check user still exists
            if (!user)
                return res.status(401).json({ message: 'Unauthorized' });

            // authorization successful
            req.user = user.get();
            next();
        }
    ];
}