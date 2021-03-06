const Validate = require("../validate");

const HomeRun = require("./HomeRun");
const RunResult = require("./RunResult");
const ClubsEnums = require("../common/ClubsEnums");

const NetError = require("../errors/ParkrunNetError");
const DataNotAvailableError = require("../errors/ParkrunDataNotAvailableError");

const AthleteExpandedSchema = require("../schemas/AthleteExpanded");

// Importing for IntelliSense
const AxiosInstance = require("axios").default;

const capitalize = str =>
  str.toLowerCase().replace(/^\w/, c => c.toUpperCase());

/**
 * A class representing a Parkrun User.
 */
class User {
  /**
   * Create a new User class from the API responses.
   *
   * @param {*} res the API response
   * @param {AxiosInstance} authedNet parkrun.js networking instance
   * @returns {User} the new user class
   */
  constructor(res, authedNet) {
    const data = Validate(res, AthleteExpandedSchema).value.data.Athletes[0];

    this._athleteID = Number.parseInt(data.AthleteID);
    this._avatar = data.Avatar;
    this._clubName = data.ClubName;
    this._firstName = data.FirstName;
    this._homeRun = new HomeRun(
      data.HomeRunID,
      data.HomeRunLocation,
      data.HomeRunName
    );
    this._lastName = data.LastName;
    this._sex = data.Sex;
    this._authedNet = authedNet;
  }

  /**
   * Get the user's Athlete ID.
   *
   * @returns {Number}
   */
  getID() {
    return this._athleteID;
  }

  /**
   * Get the URL for the user's avatar.
   *
   * @returns {String} URL
   */
  getAvatar() {
    return this._avatar;
  }

  /**
   * Get the user's club name
   *
   * @returns {String} club name
   */
  getClubName() {
    return this._clubName;
  }

  /**
   * Get the user's first name
   *
   * @returns {String} first name
   */
  getFirstName() {
    return capitalize(this._firstName);
  }

  /**
   * Get the Home Run object for this user.
   *
   * @returns {HomeRun} HomeRun object
   */
  getHomeRun() {
    return this._homeRun;
  }

  /**
   * Get the user's last name
   *
   * @returns {String} last name
   */
  getLastName() {
    return capitalize(this._lastName);
  }

  /**
   * Get the user's gender.
   *
   * @returns {String} gender
   */
  getSex() {
    return this._sex;
  }

  /**
   * Gets the user's full name.
   *
   * @returns {String} full name
   */
  getFullName() {
    return `${this.getFirstName()} ${this.getLastName()}`;
  }

  /**
   * Get the user's run count.
   *
   * @returns {Promise<Number>} Run count.
   * @throws {ParkrunNetError} ParkrunJS Networking Error.
   */
  async getRunCount() {
    const res = await this._authedNet
      .get("/v1/hasrun/count/Run", {
        params: { athleteId: this._athleteID, offset: 0 }
      })
      .catch(err => {
        throw new NetError(err);
      });
    // If the user has no runs, this will return NaN, so in that case just return 0.
    return Number.parseInt(res.data.data.TotalRuns[0].RunTotal) || 0;
  }

  /**
   * Get a array of the user's runs.
   *
   * @returns {Promise<Array<RunResult>>}
   * @throws {ParkrunNetError} ParkrunJS Networking Error.
   */
  async getRuns() {
    const res = await this._authedNet
      .get("/v1/results", {
        params: {
          athleteId: this._athleteID,
          orderBy: "EventDate", // The app uses this, but it does not return in order.
          limit: 1000,
          offset: 0
        }
      })
      .catch(err => {
        throw new NetError(err);
      });

    const out = [];
    for (var i = 0, len = res.data.data.Results.length; i < len; i++) {
      out.push(new RunResult(res.data.data.Results[i]));
    }
    return out;
  }

  /**
   * Get the user's Parkrun Clubs (for milestone runs / duties)
   *
   * @returns {Promise<Object>}
   * @throws {ParkrunNetError} ParkrunJS Networking Error.
   * @throws {ParkrunDataNotAvailableError} Error when no data is available, usually because of a new account with no runs.
   *
   * @example
   *
   * const user = .....
   *
   *
   * await user.getClubs()
   *
   * // Example Response:
   *
   * {
   *   ParkrunClub: { id: 'c3', name: '250+ Club' }
   *   JuniorClub: { id: 'j0', name: 'No Club' },
   *   VolunteerClub: { id: 'v1', name: 'Volunteer 25+ Club' }
   * }
   */
  async getClubs() {
    // We are using /v1/results (from getRuns() as it returns all club statuses at once.)
    const res = await this._authedNet
      .get(`/v1/results`, {
        params: {
          athleteId: this._athleteID,
          limit: 1,
          offset: 0
        }
      })
      .catch(err => {
        throw new NetError(err);
      });
    const data = res.data.data.Results[0];
    if (data == undefined)
      throw new DataNotAvailableError("getClubs, athlete " + this.getID());
    return {
      ParkrunClub: ClubsEnums.CLUBS[data.parkrunClubMembership],
      JuniorClub: ClubsEnums.JUNIOR_CLUBS[data.JuniorClubMembership],
      VolunteerClub: ClubsEnums._volnFromCount(data.volcount)
    };
  }
}

module.exports = User;
