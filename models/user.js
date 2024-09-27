// TOKEN IS NULL IN THE TESTS and i cant figure it out

/** User class for message.ly */
const db = require("../db");
const bcrypt = require("bcrypt");
const { SECRET_KEY, BCRYPT_WORK_FACTOR } = require("../config");
const ExpressError = require("../expressError");
const jwt = require("jsonwebtoken");

/** User of the site. */

class User {
  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({ username, password, first_name, last_name, phone }) {
    try {
      //hash password
      const hashedPw = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);
      //store in db with hashed pw
      const res = await db.query(
        `INSERT INTO users 
      (username, password, first_name, last_name, phone, join_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING username`,
        [username, hashedPw, first_name, last_name, phone]
      );
      await User.updateLoginTimestamp(username);
      //dont know why the test would expect me to return password with this
      return res.rows[0];
    } catch (e) {
      throw new ExpressError(e.message, 400);
    }
  }

  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    try {
      const res = await db.query(
        `SELECT password FROM users WHERE username = $1`,
        [username]
      );
      const user = res.rows[0];

      if (user) {
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
          await User.updateLoginTimestamp(username);
          const token = jwt.sign({ username }, SECRET_KEY);
          return token;
        }
      }
      return null;
    } catch (e) {
      throw new ExpressError("Error during authentication", 400);
    }
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    try {
      const res = await db.query(
        `UPDATE users
        SET last_login_at = CURRENT_TIMESTAMP
        WHERE username = $1
        RETURNING username, last_login_at`,
        [username]
      );

      if (!res.rows[0]) {
        throw new ExpressError("User not found", 404);
      }
    } catch (e) {
      throw new ExpressError("Error updating login timestamp", 400);
    }
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() {
    try {
      const res = await db.query(
        `SELECT username, first_name, last_name, phone
      FROM users`
      );
      return res.rows;
    } catch (e) {
      throw new ExpressError("Error fetching users", 400);
    }
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    try {
      const res = await db.query(
        `SELECT username, first_name, last_name, phone, join_at, last_login_at
        FROM users
        WHERE username = $1`,
        [username]
      );
      if (!res.rows[0]) {
        throw new ExpressError(`User not found: ${username}`, 404);
      }
      return res.rows[0];
    } catch (e) {
      throw new ExpressError(`could not find user ${username}`, 400);
    }
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  /** Return messages sent by this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */
  static async messagesFrom(username) {
    try {
      const res = await db.query(
        `SELECT m.id, 
              m.body, 
              m.sent_at, 
              m.read_at, 
              u.username AS to_username, 
              u.first_name AS to_first_name, 
              u.last_name AS to_last_name, 
              u.phone AS to_phone
       FROM messages AS m
       JOIN users AS u ON m.to_username = u.username
       WHERE m.from_username = $1`,
        [username]
      );

      // Map the result to include the recipient's (to_user) details as an object
      return res.rows.map((row) => ({
        id: row.id,
        body: row.body,
        sent_at: row.sent_at,
        read_at: row.read_at,
        to_user: {
          username: row.to_username,
          first_name: row.to_first_name,
          last_name: row.to_last_name,
          phone: row.to_phone,
        },
      }));
    } catch (e) {
      throw new ExpressError("Could not find messages", 400);
    }
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    try {
      const res = await db.query(
        `SELECT m.id,
                m.body,
                m.sent_at,
                m.read_at,
                u.username AS from_username,
                u.first_name AS from_first_name,
                u.last_name AS from_last_name,
                u.phone AS from_phone
        FROM messages AS m
        JOIN users AS u ON m.from_username = u.username
        WHERE m.to_username = $1`,
        [username]
      );
      return res.rows.map((row) => ({
        id: row.id,
        body: row.body,
        sent_at: row.sent_at,
        read_at: row.read_at,
        from_user: {
          username: row.from_username,
          first_name: row.from_first_name,
          last_name: row.from_last_name,
          phone: row.from_phone,
        },
      }));
    } catch (e) {
      throw new ExpressError("Could not find messages", 400);
    }
  }
}

module.exports = User;
