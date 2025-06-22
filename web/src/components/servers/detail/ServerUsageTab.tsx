'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ServerTabProps } from './types';

export function ServerUsageTab({ server }: ServerTabProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* 클라이언트 세션 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>클라이언트 세션</CardTitle>
          <CardDescription>
            현재 연결된 클라이언트들의 세션 정보입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <div className="font-medium text-sm">Cline Session</div>
                  <div className="text-xs text-muted-foreground">활성 세션 - 2분 전</div>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">활성</Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <div>
                  <div className="font-medium text-sm">Cursor Session</div>
                  <div className="text-xs text-muted-foreground">비활성 - 1시간 전</div>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">비활성</Badge>
            </div>
            
            <div className="text-center py-4 text-muted-foreground">
              <p className="text-sm">총 2개의 세션 기록</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 사용 통계 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>사용 통계</CardTitle>
          <CardDescription>
            도구 호출 및 사용 패턴 통계입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">24</div>
                <div className="text-sm text-blue-600">총 호출</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">22</div>
                <div className="text-sm text-green-600">성공</div>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">2</div>
                <div className="text-sm text-red-600">실패</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">0.8s</div>
                <div className="text-sm text-purple-600">평균 응답</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 최근 도구 호출 기록 */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>최근 도구 호출 기록</CardTitle>
          <CardDescription>
            최근에 실행된 도구 호출 내역입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <div className="font-medium text-sm">brave_local_search</div>
                  <div className="text-xs text-muted-foreground">
                    Cline에서 호출 - 12분 전
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs text-green-600">성공</Badge>
                <span className="text-xs text-muted-foreground">0.8초</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <div>
                  <div className="font-medium text-sm">brave_web_search</div>
                  <div className="text-xs text-muted-foreground">
                    Cursor에서 호출 - 1시간 전
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs text-red-600">실패</Badge>
                <span className="text-xs text-muted-foreground">타임아웃</span>
              </div>
            </div>

            <div className="text-center py-4 border-t">
              <Button variant="outline" size="sm">
                더 많은 로그 보기
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}