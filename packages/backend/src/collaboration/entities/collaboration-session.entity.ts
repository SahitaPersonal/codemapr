import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { SessionParticipant } from './session-participant.entity';
import { Annotation } from './annotation.entity';
import { ActivityLog } from './activity-log.entity';

@Entity('collaboration_sessions')
@Index(['projectId'])
@Index(['createdBy'])
@Index(['isActive'])
export class CollaborationSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255 })
  projectId: string;

  @Column({ length: 255 })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column('text', { 
    default: '{}',
    transformer: {
      to: (value: any) => JSON.stringify(value || {}),
      from: (value: string) => {
        try {
          return JSON.parse(value || '{}');
        } catch {
          return {};
        }
      },
    },
  })
  settings: {
    allowAnonymous: boolean;
    maxParticipants: number;
    autoSave: boolean;
    conflictResolution: 'last-write-wins' | 'operational-transform';
  };

  @OneToMany(() => SessionParticipant, participant => participant.session, {
    cascade: true,
    eager: false,
  })
  participants: SessionParticipant[];

  @OneToMany(() => Annotation, annotation => annotation.session, {
    cascade: true,
    eager: false,
  })
  annotations: Annotation[];

  @OneToMany(() => ActivityLog, log => log.session, {
    cascade: true,
    eager: false,
  })
  activityLogs: ActivityLog[];
}