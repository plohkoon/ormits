
import sqlite, { Database, RunResult, Statement } from 'sqlite3';
import path from 'path';

// This is a wrapper around the standard DB object that
// promisifys all the functions with callbacks
class AsyncDatabase {
  db: Database;

  constructor(dbPath: string) {
    this.db = new sqlite.Database(dbPath);
  }

  close() : Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err: Error | null) => {
        if(err) reject(err);
        resolve();
      });
    });
  }

  configure(option: "busyTimeout", value: number) : void {
    this.db.configure(option, value);
  }

  run(sql: string, params: any=[]) : Promise<RunResult> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if(err) reject(err);
        else resolve(this);
      });
    });
  }

  get(sql: string, params: any=[]) : Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, function(err, row) {
        if(err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql: string, params: any=[]) : Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, function(err, rows) {
        if(err) reject(err);
        else resolve(rows);
      });
    });
  }

  each(sql: string, params: any=[], callback = (err: Error | null, row: any): void => {}) : Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.each(sql, params, callback, function(err: Error | null, numRetrieved: number) {
        if(err) reject(err);
        else resolve(numRetrieved);
      });
    });
  }

  exec(sql: string) : Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, function(err) {
        if(err) reject(err);
        else resolve();
      });
    });
  }

  prepare(sql: string, params: any=[]) : Promise<Statement> {
    return new Promise((resolve, reject) => {
      let statement = this.db.prepare(sql, params, (err) => {
        if(err) reject(err)
      })
      if(statement) resolve(statement)
      else reject('Something went wrong')
    })
  }
}

// =========================================================
// This is the initialization and cleanup of the database

// TODO: Fix this
const dbPath = path.resolve(process.cwd(), 'data', 'dev.db');

// const dbPath = __dirname + '/../data/project.db'

const db = new AsyncDatabase(dbPath);

process.stdin.resume();

let close = () => {
  console.log('closing database')
  db.close()
    .then(res => console.log("Database closed"))
    .catch(err => console.log(err))
    .finally(() => process.exit())
}

process.on('SIGINT', close);
process.on('exit', close);
process.on('SIGUSR1', close);
process.on('SIGUSR2', close);
process.on('uncaughtException', close);

export default db;