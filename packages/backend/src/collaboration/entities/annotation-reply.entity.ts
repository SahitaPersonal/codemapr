import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Annotation } from './annotation.entity';

@Entity('annotation_replies')
@Index(['annotationId'])
@Index(['userId'])
export class AnnotationReply {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  annotationId: string;

  @Column({ length: 255 })
  userId: string;

  @Column({ length: 255 })
  username: string;

  @Column('text')
  content: string;

  @CreateDateColumn()
  createdAt: Date;

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

  @ManyToOne(() => Annotation, annotation => annotation.replies, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'annotationId' })
  annotation: Annotation;
}