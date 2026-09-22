import { apiGet, apiPost } from '@/api/http'
import { unwrapList, unwrapObject } from '@/utils/apiHelpers'
import type {
  Classroom,
  ClassroomRequest,
  ClassroomUser,
  ClassroomUserRequest,
  ApiMessageResponse,
} from '@/api/types'

function unwrapClassrooms(data: unknown): Classroom[] {
  return unwrapList<Classroom>(data).filter((c) => c && typeof c.id === 'number')
}

function unwrapClassroom(data: unknown): Classroom | null {
  const direct = unwrapObject<Classroom>(data)
  if (direct && typeof direct.id === 'number') return direct
  return unwrapClassrooms(data)[0] ?? null
}

function unwrapClassroomUsers(data: unknown): ClassroomUser[] {
  return unwrapList<ClassroomUser>(data).filter((u) => u && typeof u.id === 'number')
}

/** POST /api/v1/private/classrooms */
export async function createClassroom(
  payload: ClassroomRequest,
): Promise<Classroom | null> {
  const data = await apiPost<unknown>('private/classrooms', payload)
  return unwrapClassroom(data)
}

/** POST /api/v1/private/classrooms/users */
export async function addClassroomUser(
  payload: ClassroomUserRequest,
): Promise<ApiMessageResponse & { id?: number }> {
  return apiPost('private/classrooms/users', payload)
}

/** GET /api/v1/protected/classrooms */
export async function listAllClassrooms(): Promise<Classroom[]> {
  const data = await apiGet<unknown>('protected/classrooms')
  return unwrapClassrooms(data)
}

/** GET /api/v1/private/classrooms/mine */
export async function listMyClassrooms(): Promise<Classroom[]> {
  const data = await apiGet<unknown>('private/classrooms/mine')
  return unwrapClassrooms(data)
}

/** GET /api/v1/private/classrooms/{id} */
export async function getClassroomById(id: number): Promise<Classroom | null> {
  const data = await apiGet<unknown>(`private/classrooms/${id}`)
  return unwrapClassroom(data)
}

/** GET /api/v1/private/classrooms/{id}/users */
export async function listClassroomUsers(id: number): Promise<ClassroomUser[]> {
  const data = await apiGet<unknown>(`private/classrooms/${id}/users`)
  return unwrapClassroomUsers(data)
}
