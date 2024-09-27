const express = require("express");
const router = new express.Router();

const ExpressError = require("../expressError");
const { User } = require("../models/user");

/** POST /login - login: {username, password} => {token}
 *
 * Make sure to update their last-login!
 *
 **/

router.post("/login", async function (req, res, next) {
  try {
    const { username, password } = req.body;
    const token = await User.authenticate(username, password);
    if (token) {
      return res.json({ token });
    } else throw new ExpressError("invalid user/password", 400);
  } catch (e) {
    return next(e);
  }
});

/** POST /register - register user: registers, logs in, and returns token.
 *
 * {username, password, first_name, last_name, phone} => {token}.
 *
 *  Make sure to update their last-login!
 */

router.post("/register", async function (req, res, next) {
  try {
    const { username, password, first_name, last_name, phone } = req.body;

    // Register the user
    const user = await User.register({
      username,
      password,
      first_name,
      last_name,
      phone,
    });

    // Generate a token for the registered user
    const token = await User.authenticate(username, password);

    if (!token) {
      throw new ExpressError(
        "Registration successful, but token generation failed",
        400
      );
    }

    return res.json({ username: user.username, token });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
