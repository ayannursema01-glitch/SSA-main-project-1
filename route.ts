import { NextResponse } from 'next/server'
import { db } from '@/lib/db'


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      )
    }

    // Verify user exists
    const user = await db.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Fetch all data in parallel
    const [calendarEvents, files, userAchievements, collabPosts, chatRooms, roomMemberships] =
      await Promise.all([
        db.calendarEvent.findMany({
          where: { authorId: userId },
          orderBy: { date: 'asc' },
        }),
        db.fileItem.findMany({
          where: { authorId: userId },
          orderBy: { createdAt: 'desc' },
        }),
        db.userAchievement.findMany({
          where: { userId },
          include: { achievement: true },
        }),
        db.collaborationPost.findMany({
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { author: true },
        }),
        db.chatRoom.findMany({
          include: {
            members: { include: { user: true } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        }),
        db.roomMember.findMany({
          where: { userId },
          select: { roomId: true },
        }),
      ])

    // Format calendar events
    const formattedCalendarEvents = calendarEvents.map((evt) => ({
      id: evt.id,
      title: evt.title,
      description: evt.description || undefined,
      date: evt.date,
      startTime: evt.startTime || undefined,
      endTime: evt.endTime || undefined,
      type: evt.type as 'study' | 'exam' | 'assignment' | 'event' | 'meeting' | 'reminder',
      color: evt.color,
      isCompleted: evt.isCompleted,
      subject: evt.subject || undefined,
    }))

    // Format files - convert tags from comma-separated string to array, dates to timestamps
    const formattedFiles = files.map((file) => ({
      id: file.id,
      name: file.name,
      type: file.type as 'folder' | 'pdf' | 'text' | 'image' | 'doc' | 'audio' | 'video' | 'other',
      size: file.size,
      parentId: file.parentId,
      createdAt: new Date(file.createdAt).getTime(),
      updatedAt: new Date(file.updatedAt).getTime(),
      content: file.content || undefined,
      url: file.url || undefined,
      isStarred: file.isStarred,
      tags: file.tags ? file.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    }))

    // Format achievements - include all defined achievements with earned status
    const allAchievements = await db.achievement.findMany()
    const earnedMap = new Map(
      userAchievements.map((ua) => [ua.achievementId, ua.earnedAt])
    )

    const formattedAchievements = allAchievements.map((ach) => ({
      id: ach.id,
      key: ach.key,
      title: ach.title,
      description: ach.description,
      emoji: ach.emoji,
      earned: earnedMap.has(ach.id),
      earnedAt: earnedMap.has(ach.id)
        ? new Date(earnedMap.get(ach.id)!).toISOString()
        : undefined,
    }))

    // Format collaboration posts
    const userRoomIds = new Set(roomMemberships.map((rm) => rm.roomId))
    const formattedCollabPosts = collabPosts.map((post) => ({
      id: post.id,
      authorId: post.authorId,
      authorName: post.author.name || 'Student',
      content: post.content,
      type: post.type as 'introduction' | 'study-request' | 'resource' | 'question' | 'achievement',
      tags: post.tags ? post.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      likes: post.likes,
      comments: post.comments,
      createdAt: new Date(post.createdAt).getTime(),
      isLiked: false,
    }))

    // Format chat rooms - only include rooms the user is a member of
    const formattedChatRooms = chatRooms
      .filter((room) => userRoomIds.has(room.id))
      .map((room) => ({
        id: room.id,
        name: room.name,
        type: room.type as 'private' | 'group',
        participants: room.members.map((m) => ({
          id: m.userId,
          name: m.user.name || 'Student',
        })),
        lastMessage: room.messages[0]?.content || undefined,
        lastMessageTime: room.messages[0]
          ? new Date(room.messages[0].createdAt).getTime()
          : undefined,
        unreadCount: 0,
      }))

    return NextResponse.json({
      calendarEvents: formattedCalendarEvents,
      files: formattedFiles,
      knowledgeConcepts: [],
      achievements: formattedAchievements,
      collabPosts: formattedCollabPosts,
      chatRooms: formattedChatRooms,
    })
  } catch (error) {
    console.error('[User Data API Error]', error)
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    )
  }
}
