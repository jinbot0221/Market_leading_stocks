const fs = require('node:fs');
const path = require('node:path');

const KST_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
});

class HistoryStore {
  constructor(filePath) {
    this.filePath = filePath;
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
    const history = this.read();
    const date = snapshot.date || KST_DATE.format(new Date());
    const record = { ...snapshot, date, capturedAt: new Date().toISOString() };
    const existing = history.findIndex((item) => item.date === date);

    if (existing >= 0) history[existing] = record;
    else history.push(record);

    const trimmed = history.sort((a, b) => a.date.localeCompare(b.date)).slice(-365);
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(trimmed, null, 2)}\n`);
    fs.renameSync(temporary, this.filePath);
    return record;
  }
}

module.exports = { HistoryStore };
