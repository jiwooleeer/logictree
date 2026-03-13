export const CATEGORIES = {
  cognitive: '인지적',
  behavioral: '행동적',
  structural: '구조적',
};

export const CATEGORY_COLORS = {
  cognitive: 'bg-blue-100 text-blue-700',
  behavioral: 'bg-green-100 text-green-700',
  structural: 'bg-purple-100 text-purple-700',
};

export const STATUSES = {
  pending: '검증 대기',
  success: '성공',
  fail: '실패',
};

export const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-600 border border-gray-300',
  success: 'bg-green-100 text-green-700 border border-green-700',
  fail: 'bg-red-100 text-red-700 border border-red-300',
};

// 게시글 작성 상태 (draft/submitted 과 별개)
export const WRITING_STATUSES = {
  writing: '작성중',
  done: '작성완료',
};

export const WRITING_STATUS_COLORS = {
  writing: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
  done: 'bg-green-100 text-green-700 border border-green-300',
};
