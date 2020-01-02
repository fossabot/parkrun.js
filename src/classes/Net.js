const axios = require("axios").default;

const constants = require("../constants");
// Get the initial user/pass from the raw auth data
const authSplit = Buffer.from(constants.auth_raw, "base64")
  .toString("utf8")
  .split(":");

const opts = {
  baseURL: constants.api_base,
  auth: {
    username: authSplit[0],
    password: authSplit[1]
  },
  headers: {
    "User-Agent": constants.user_agent,
    "X-Powered-By": "Parkrun.JS"
  }
};

class Net {
  static getNonAuthed() {
    return axios.create(opts);
  }

  constructor(access_token) {
    const auth_opts = Object.assign(opts, {
      params: {
        expandedDetails: true,
        access_token,
        scope: "app"
      },
      auth: undefined
    });
    this._params = auth_opts.params;
    this._axiosAuthed = axios.create(auth_opts);
  }

  getAuthed() {
    return this._axiosAuthed;
  }
}

module.exports = Net;
