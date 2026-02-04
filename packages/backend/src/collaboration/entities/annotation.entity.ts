import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { CollaborationSession } from './collaboration-session.entity';
import { AnnotationReply } from './annotation-reply.entity';

export type AnnotationType = 'comment' | 'suggestion' | 'issue';
export type AnnotationStatus = 'active' | 'resolved' | 'deleted';

@Entity('annotations')
@Index(['sessionId'])
@Index(['userId'])
@Index(['file'])
@Index(['status'])
@Index(['type'])
export class Annotation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  sessionId: string;

  @Column({ length: 255 })
  userId: string;

  @Column({ length: 255 })
  username: string;

  @Column({ length: 500 })
  file: string;

  @Column('int')
  line: number;

  @Column('int')
  column: number;

  @Column('text')
  content: string;

  @Column({ length: 50, default: 'comment' })
  type: AnnotationType;

  @Column({ length: 50, default: 'active' })
  status: AnnotationStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('text', { 
    nullable: true,
    transformer: {
      to: (value: any) => value ? JSON.stringify(value) : null,
      from: (value: string) => {
        if (!value) return null;
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      },
    },
  })
  metadata: Record<string, any>;

  @ManyToOne(() => CollaborationSession, session => session.annotations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sessionId' })
  session: CollaborationSession;

  @OneToMany(() => AnnotationReply, reply => reply.annotation, {
    cascade: true,
    eager: false,
  })
  replies: AnnotationReply[];
}