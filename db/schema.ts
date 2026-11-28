import {sqliteTable,text,integer,primaryKey,index,check} from 'drizzle-orm/sqlite-core';
import {sql} from 'drizzle-orm';
export const members=sqliteTable('members',{email:text('email').primaryKey(),role:text('role').notNull(),createdAt:text('created_at').notNull()},table=>[check('member_role',sql`${table.role} IN ('admin','staff','viewer')`)]);
export const records=sqliteTable('records',{entity:text('entity').notNull(),recordKey:text('record_key').notNull(),value:text('value').notNull(),revision:integer('revision').notNull().default(1)},table=>[primaryKey({columns:[table.entity,table.recordKey]})]);
export const events=sqliteTable('events',{seq:integer('seq').primaryKey({autoIncrement:true}),operationId:text('operation_id').notNull().unique(),entity:text('entity').notNull(),recordKey:text('record_key').notNull(),at:text('at').notNull(),actor:text('actor').notNull(),description:text('description').notNull(),value:text('value').notNull()},table=>[index('events_entity').on(table.entity,table.seq)]);
export const scheduleLock=sqliteTable('schedule_lock',{id:integer('id').primaryKey(),revision:integer('revision').notNull().default(0)},table=>[check('singleton_schedule_lock',sql`${table.id} = 1`)]);

export const memberDevices = sqliteTable('member_devices', {
  email: text('email').notNull().references(() => members.email, { onDelete: 'cascade' }),
  deviceId: text('device_id').notNull(),
  label: text('label').notNull(),
  lastSeen: text('last_seen').notNull(),
}, table => [primaryKey({ columns: [table.email, table.deviceId] })]);

// The previous teaching workspace remains available as a private recovery snapshot.
export const classroomRecords=sqliteTable('classroom_records',{entity:text('entity').notNull(),recordKey:text('record_key').notNull(),value:text('value').notNull(),revision:integer('revision').notNull().default(1)},table=>[primaryKey({columns:[table.entity,table.recordKey]})]);
export const classroomEvents=sqliteTable('classroom_events',{seq:integer('seq').primaryKey({autoIncrement:true}),operationId:text('operation_id').notNull().unique(),entity:text('entity').notNull(),recordKey:text('record_key').notNull(),at:text('at').notNull(),actor:text('actor').notNull(),description:text('description').notNull(),value:text('value').notNull()},table=>[index('classroom_events_entity').on(table.entity,table.seq)]);
