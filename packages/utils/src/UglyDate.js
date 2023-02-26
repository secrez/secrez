const second = 1e3,
  minute = second * 60,
  hour = minute * 60,
  day = hour * 24,
  week = day * 7,
  month = day * 30,
  year = day * 365;

class UglyDate {
  throwError() {
    throw new Error("Bad or unsupported format");
  }

  uglify(when, now = Date.now()) {
    if (typeof when !== "string") {
      this.throwError();
    }
    if (/now/.test(when)) {
      return now;
    }
    if (/yesterday/.test(when)) {
      return now - day;
    }
    let quantity, period;
    if (/^\d+(s|m|h|d|w|M|y)$/.test(when)) {
      quantity = parseInt(when);
      let p = when.split(/\d+/)[1];
      if (p === "M") {
        period = "month";
      } else {
        for (let int in UglyDate.interval) {
          if (RegExp("^" + p).test(int)) {
            period = int;
            break;
          }
        }
      }
    } else {
      when = when.replace(/^a(n|) /, "1 ").split(" ");
      quantity = parseInt(when[0]);
      if (isNaN(quantity)) {
        this.throwError();
      }
      for (let int in UglyDate.interval) {
        if (RegExp("^" + int).test(when[1])) {
          period = int;
          break;
        }
      }
    }
    if (quantity === 0) {
      return 0;
    }
    if (!quantity || !period) {
      this.throwError();
    }
    return now - quantity * UglyDate.interval[period];
  }

  shortify(timestamp, now = Date.now()) {
    const diff = now - timestamp;
    let prev;
    for (let int in UglyDate.interval) {
      // console.log(diff)
      if (diff < UglyDate.interval[int]) {
        if (int === "second") {
          return "now";
        } else {
          let quantity = Math.round(diff / UglyDate.interval[prev]);
          let str;
          if (prev === "month") {
            str = "M";
          } else {
            str = prev[0];
          }
          return quantity + str;
        }
      }
      prev = int;
    }
    // more than 1 year
    return Math.round(diff / UglyDate.interval.year) + "y";
  }
}

UglyDate.interval = {
  second,
  minute,
  hour,
  day,
  week,
  month,
  year,
};

module.exports = UglyDate;
