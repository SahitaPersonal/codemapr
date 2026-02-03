export interface CollaborationSession {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  participants: SessionParticipant[];
  annotations: Annotation[];
  cursors: UserCursor[];
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  settings: SessionSettings;
}

export interface SessionParticipant {
  userId: string;
  user: CollaborationUser;
  role: ParticipantRole;
  joinedAt: Date;
  lastActiveAt: Date;
  isOnline: boolean;
  permissions: ParticipantPermissions;
}

export interface CollaborationUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string; // Assigned color for cursors and annotations
}

export interface Annotation {
  id: string;
  sessionId: string;
  authorId: string;
  author: CollaborationUser;
  type: AnnotationType;
  content: AnnotationContent;
  location: AnnotationLocation;
  replies: AnnotationReply[];
  status: AnnotationStatus;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface AnnotationContent {
  text: string;
  mentions: UserMention[];
  attachments: AnnotationAttachment[];
  formatting: TextFormatting;
}

export interface AnnotationReply {
  id: string;
  authorId: string;
  author: CollaborationUser;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnnotationLocation {
  type: LocationType;
  filePath?: string;
  nodeId?: string;
  edgeId?: string;
  coordinates?: Coordinates;
  codeRange?: CodeRange;
}

export interface UserCursor {
  userId: string;
  user: CollaborationUser;
  position: CursorPosition;
  selection?: Selection;
  lastUpdated: Date;
  isActive: boolean;
}

export interface CursorPosition {
  x: number;
  y: number;
  viewportId: string; // Which view/panel the cursor is in
}

export interface Selection {
  type: SelectionType;
  nodeIds?: string[];
  edgeIds?: string[];
  codeRange?: CodeRange;
  coordinates?: SelectionArea;
}

export interface SelectionArea {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface CodeRange {
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
}

export interface UserMention {
  userId: string;
  username: string;
  startIndex: number;
  endIndex: number;
}

export interface AnnotationAttachment {
  id: string;
  type: AttachmentType;
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface TextFormatting {
  bold: TextRange[];
  italic: TextRange[];
  code: TextRange[];
  links: LinkRange[];
}

export interface TextRange {
  startIndex: number;
  endIndex: number;
}

export interface LinkRange extends TextRange {
  url: string;
  title?: string;
}

export interface SessionSettings {
  allowAnonymousUsers: boolean;
  maxParticipants: number;
  autoSaveInterval: number;
  notificationSettings: SessionNotificationSettings;
  permissions: DefaultPermissions;
}

export interface SessionNotificationSettings {
  newAnnotations: boolean;
  userJoined: boolean;
  userLeft: boolean;
  mentionsOnly: boolean;
}

export interface ParticipantPermissions {
  canAnnotate: boolean;
  canEditAnnotations: boolean;
  canDeleteAnnotations: boolean;
  canInviteUsers: boolean;
  canModifySession: boolean;
  canViewPrivateAnnotations: boolean;
}

export interface DefaultPermissions {
  viewer: ParticipantPermissions;
  collaborator: ParticipantPermissions;
  moderator: ParticipantPermissions;
  owner: ParticipantPermissions;
}

export interface CollaborationEvent {
  id: string;
  sessionId: string;
  type: EventType;
  userId: string;
  data: any;
  timestamp: Date;
}

export interface RealTimeUpdate {
  type: UpdateType;
  sessionId: string;
  userId: string;
  data: any;
  timestamp: Date;
}

export enum SessionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  ENDED = 'ended',
  ARCHIVED = 'archived'
}

export enum ParticipantRole {
  OWNER = 'owner',
  MODERATOR = 'moderator',
  COLLABORATOR = 'collaborator',
  VIEWER = 'viewer'
}

export enum AnnotationType {
  COMMENT = 'comment',
  QUESTION = 'question',
  SUGGESTION = 'suggestion',
  ISSUE = 'issue',
  HIGHLIGHT = 'highlight',
  BOOKMARK = 'bookmark'
}

export enum AnnotationStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  ARCHIVED = 'archived'
}

export enum LocationType {
  NODE = 'node',
  EDGE = 'edge',
  CODE = 'code',
  VIEWPORT = 'viewport',
  GENERAL = 'general'
}

export enum SelectionType {
  NODES = 'nodes',
  EDGES = 'edges',
  CODE = 'code',
  AREA = 'area'
}

export enum AttachmentType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  CODE_SNIPPET = 'code_snippet',
  LINK = 'link'
}

export enum EventType {
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  ANNOTATION_CREATED = 'annotation_created',
  ANNOTATION_UPDATED = 'annotation_updated',
  ANNOTATION_DELETED = 'annotation_deleted',
  CURSOR_MOVED = 'cursor_moved',
  SELECTION_CHANGED = 'selection_changed',
  SESSION_UPDATED = 'session_updated'
}

export enum UpdateType {
  CURSOR_UPDATE = 'cursor_update',
  SELECTION_UPDATE = 'selection_update',
  ANNOTATION_UPDATE = 'annotation_update',
  USER_PRESENCE = 'user_presence',
  SESSION_STATE = 'session_state'
}

export interface Coordinates {
  x: number;
  y: number;
}