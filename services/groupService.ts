import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore"

import { assertFirebaseConfigured } from "@/lib/firebase"
import type {
  CreateGroupInput,
  Group,
  GroupMember,
  JoinGroupUser,
} from "@/types/group"

const GROUPS_COLLECTION = "groups"

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as T
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, itemValue]) => itemValue !== undefined)
      .map(([key, itemValue]) => [key, stripUndefinedDeep(itemValue)])
    return Object.fromEntries(entries) as T
  }

  return value
}

function toIso(value?: string): string {
  return value ?? new Date().toISOString()
}

function mapGroup(id: string, data: Partial<Group>): Group {
  return {
    id,
    name: data.name ?? "",
    ownerId: data.ownerId ?? "",
    inviteCode: data.inviteCode ?? "",
    memberIds: data.memberIds ?? [],
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
    status: data.status ?? "active",
  }
}

function mapMember(data: Partial<GroupMember>): GroupMember {
  return {
    userId: data.userId ?? "",
    displayName: data.displayName ?? "",
    email: data.email ?? "",
    photoURL: data.photoURL,
    role: data.role ?? "member",
    joinedAt: toIso(data.joinedAt),
    status: data.status ?? "active",
  }
}

function randomInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

async function generateUniqueInviteCode() {
  const { db } = assertFirebaseConfigured()

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = randomInviteCode()
    const codeQuery = query(
      collection(db, GROUPS_COLLECTION),
      where("inviteCode", "==", code),
      limit(1)
    )
    const snapshot = await getDocs(codeQuery)
    if (snapshot.empty) {
      return code
    }
  }

  return `${randomInviteCode()}${Math.floor(Math.random() * 10)}`
}

function getMembersCollection(groupId: string) {
  const { db } = assertFirebaseConfigured()
  return collection(db, GROUPS_COLLECTION, groupId, "members")
}

export async function createGroup(input: CreateGroupInput): Promise<Group> {
  const { db } = assertFirebaseConfigured()
  const now = new Date().toISOString()
  const inviteCode = await generateUniqueInviteCode()

  const payload: Omit<Group, "id"> = {
    name: input.name.trim(),
    ownerId: input.owner.userId,
    inviteCode,
    memberIds: [input.owner.userId],
    createdAt: now,
    updatedAt: now,
    status: "active",
  }

  const created = await addDoc(collection(db, GROUPS_COLLECTION), payload)

  const ownerMember: GroupMember = {
    userId: input.owner.userId,
    displayName: input.owner.displayName?.trim() || input.owner.email || "Owner",
    email: input.owner.email ?? "",
    photoURL: input.owner.photoURL,
    role: "owner",
    joinedAt: now,
    status: "active",
  }

  await addDoc(getMembersCollection(created.id), stripUndefinedDeep(ownerMember))
  return mapGroup(created.id, payload)
}

export async function getUserGroups(userId: string): Promise<Group[]> {
  const { db } = assertFirebaseConfigured()
  const groupsQuery = query(
    collection(db, GROUPS_COLLECTION),
    where("memberIds", "array-contains", userId),
    orderBy("updatedAt", "desc")
  )
  const snapshot = await getDocs(groupsQuery)
  return snapshot.docs.map((docSnapshot) =>
    mapGroup(docSnapshot.id, docSnapshot.data() as Partial<Group>)
  )
}

export async function getGroupById(groupId: string): Promise<Group | null> {
  const { db } = assertFirebaseConfigured()
  const snapshot = await getDoc(doc(db, GROUPS_COLLECTION, groupId))
  if (!snapshot.exists()) {
    return null
  }

  return mapGroup(snapshot.id, snapshot.data() as Partial<Group>)
}

async function getMemberDocRefByUserId(groupId: string, userId: string) {
  const membersQuery = query(getMembersCollection(groupId), where("userId", "==", userId), limit(1))
  const membersSnapshot = await getDocs(membersQuery)
  return membersSnapshot.docs[0]?.ref ?? null
}

export async function joinGroupByInviteCode(inviteCode: string, user: JoinGroupUser): Promise<Group> {
  const { db } = assertFirebaseConfigured()
  const normalizedCode = inviteCode.trim().toUpperCase()
  const now = new Date().toISOString()
  const groupQuery = query(
    collection(db, GROUPS_COLLECTION),
    where("inviteCode", "==", normalizedCode),
    where("status", "==", "active"),
    limit(1)
  )

  const groupSnapshot = await getDocs(groupQuery)
  const groupDoc = groupSnapshot.docs[0]

  if (!groupDoc) {
    throw new Error("Codigo de convite invalido.")
  }

  const group = mapGroup(groupDoc.id, groupDoc.data() as Partial<Group>)
  const memberRef = await getMemberDocRefByUserId(group.id, user.userId)

  if (memberRef) {
    await updateDoc(memberRef, {
      displayName: user.displayName?.trim() || user.email || "Membro",
      email: user.email ?? "",
      photoURL: user.photoURL ?? null,
      status: "active",
      joinedAt: now,
    })
  } else {
    await addDoc(
      getMembersCollection(group.id),
      stripUndefinedDeep({
        userId: user.userId,
        displayName: user.displayName?.trim() || user.email || "Membro",
        email: user.email ?? "",
        photoURL: user.photoURL ?? null,
        role: "member",
        joinedAt: now,
        status: "active",
      } satisfies GroupMember)
    )
  }

  await updateDoc(doc(db, GROUPS_COLLECTION, group.id), {
    memberIds: arrayUnion(user.userId),
    updatedAt: now,
  })

  return group
}

export async function removeMember(groupId: string, userId: string) {
  const { db } = assertFirebaseConfigured()
  const group = await getGroupById(groupId)
  if (!group) {
    throw new Error("Grupo nao encontrado.")
  }

  if (group.ownerId === userId) {
    throw new Error("O dono do grupo nao pode ser removido.")
  }

  const memberRef = await getMemberDocRefByUserId(groupId, userId)
  if (memberRef) {
    await updateDoc(memberRef, {
      status: "removed",
    })
  }

  await updateDoc(doc(db, GROUPS_COLLECTION, groupId), {
    memberIds: arrayRemove(userId),
    updatedAt: new Date().toISOString(),
  })
}

export async function archiveGroup(groupId: string) {
  const { db } = assertFirebaseConfigured()
  await updateDoc(doc(db, GROUPS_COLLECTION, groupId), {
    status: "archived",
    updatedAt: new Date().toISOString(),
  })
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const membersQuery = query(getMembersCollection(groupId), orderBy("joinedAt", "asc"))
  const snapshot = await getDocs(membersQuery)
  return snapshot.docs.map((docSnapshot) => mapMember(docSnapshot.data() as Partial<GroupMember>))
}
