import winston from 'winston';

export class Logger {
  private static instance: Logger;
  private logger: winston.Logger;

  private constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
          let log = `${timestamp} [${level}]: ${message}`;
          
          if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
          }
          
          if (stack) {
            log += `\n${stack}`;
          }
          
          return log;
        })
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error'
        }),
        new winston.transports.File({
          filename: 'logs/combined.log'
        })
      ],
      exitOnError: false
    });

    // Handle uncaught exceptions
    this.logger.exceptions.handle(
      new winston.transports.File({ filename: 'logs/exceptions.log' })
    );

    // Handle unhandled promise rejections
    this.logger.rejections.handle(
      new winston.transports.File({ filename: 'logs/rejections.log' })
    );
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  public warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  public info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  public debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  public verbose(message: string, meta?: any): void {
    this.logger.verbose(message, meta);
  }

  public setLevel(level: string): void {
    this.logger.level = level;
  }
}