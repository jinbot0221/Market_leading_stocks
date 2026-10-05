const fs = require('node:fs');
const path = require('node:path');

class IntradayStore {
  constructor(filePath, retentionDays = 30) {
    this.filePath = filePath;
    this.retentionDays = retentionDays;
  }

  read() {
    try {
      return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }

  save(snapshot) {
    const days = this.read();
    let day = days.find((item) => item.date === snapshot.date);
    if (!day) {
      day = { date: snapshot.date, snapshots: [] };
      days.push(day);
    }
    const existing = day.snapshots.findIndex((item) => item.time === snapshot.time);
    if (existing >= 0) day.snapshots[existing] = snapshot;
    else day.snapshots.push(snapshot);
    day.snapshots.sort((a, b) => a.time.localeCompare(b.time));

    const trimmed = days.sort((a, b) => a.date.localeCompare(b.date)).slice(-this.retentionDays);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(trimmed, null, 2)}\n`);
    fs.renameSync(temporary, this.filePath);
    return snapshot;
  }

  getDate(date) {
    return this.read().find((item) => item.date === date) || { date, snapshots: [] };
  }
}

module.exports = { IntradayStore };
