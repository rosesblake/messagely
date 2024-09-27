// no idea how the token is supposed to get to req.body
// cannot test anything. I guess i should have written the code to the tests to make them pass? i dont know. feels wrong.
const express = require("express");
const router = new express.Router();
const jwt = require("jsonwebtoken");

const ExpressError = require("../expressError");
const { User } = require("../models/user");
const { Message } = require("../models/message");
const { SECRET_KEY } = require("../config");

/** GET /:id - get detail of message.
 *
 * => {message: {id,
 *               body,
 *               sent_at,
 *               read_at,
 *               from_user: {username, first_name, last_name, phone},
 *               to_user: {username, first_name, last_name, phone}}
 *
 * Make sure that the currently-logged-in users is either the to or from user.
 *
 **/
router.get("/:id", async function (req, res, next) {
  try {
    const { id } = req.params;
    //dont really understand the req._token and req.user situation
    const user = req.user;
    const message = await Message.get(id);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }
    //dont know if it even holds username. lessons are a little rough in this section.
    if (
      message.from_user.username === user.username ||
      message.to_user.username === user.username
    ) {
      return res.json({ message });
    } else {
      return res
        .status(404)
        .json({ error: "Not authorized to view this message" });
    }
  } catch (e) {
    return next(e);
  }
});

/** POST / - post message.
 *
 * {to_username, body} =>
 *   {message: {id, from_username, to_username, body, sent_at}}
 *
 **/
router.post("/", async function (req, res, next) {
  try {
    const { to_username, body } = req.body;
    const from_username = req.user.username;
    const message = await Message.create({ from_username, to_username, body });
    return res.json({ message });
  } catch (e) {
    return next(e);
  }
});
/** POST/:id/read - mark message as read:
 *
 *  => {message: {id, read_at}}
 *
 * Make sure that the only the intended recipient can mark as read.
 *
 **/
router.post("/:id/read", async function (req, res, next) {
  try {
    const { id } = req.params;
    const user = req.user;
    const message = await Message.get(id);

    if (message.to_user.username !== user.username) {
      throw new ExpressError("Unauthorized", 403);
    }

    const updatedMessage = await Message.markRead(id);
    return res.json({ message: updatedMessage });
  } catch (e) {
    return next(e);
  }
});
