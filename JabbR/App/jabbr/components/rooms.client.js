/*global define, window, document*/
define([
    'jquery',
    'logger',
    'kernel',
    'jabbr/state',
    'jabbr/events',
    'jabbr/utility',
    'jabbr/viewmodels/message'
], function ($, Logger, kernel, state, events, utility, Message) {
    var logger = new Logger('jabbr/components/rooms.client'),
        ru = null,
        client = null,
        ui = null,
        users = null,
        messages = null,
        lobby = null,
        object = null;

    logger.trace('loaded');

    var initialize = function () {
        var $this = $(this),
            rooms = {},  // Joined Rooms
            roomCache = {},  // Available Rooms
            messageHistory = {},
            messageIds = [],
            historyLocation = 0,
            roomsToLoad = 0,
            loadingHistory = false;

        //
        // Functions
        //

        //#region Core Room Functions (get, has, validate)

        function cleanRoomName(roomName) {
            if (roomName === null) {
                return "";
            }
            return roomName.toString().toUpperCase();
        }

        function getRoom(roomName) {
            if (!hasRoom(roomName)) {
                return null;
            }
            if (!validRoom(roomName)) {
                if (!ru.updateRoom(roomName)) {
                    return null;
                }
            }
            return rooms[cleanRoomName(roomName)];
        }

        function hasRoom(roomName) {
            return cleanRoomName(roomName) in rooms;
        }

        function validRoom(roomName) {
            return rooms[cleanRoomName(roomName)].exists();
        }

        function removeRoom(roomName) {
            var room = getRoom(roomName),
                scrollHandler = null;

            if (room !== null) {
                // Remove the scroll handler from this room
                scrollHandler = room.messages.data('scrollHandler');
                room.messages.unbind('scrollHandler', scrollHandler);

                room.tab.remove();
                room.messages.remove();
                room.users.remove();
                room.roomTopic.remove();
                ru.setAccessKeys();
            }

            if (hasRoom(roomName)) {
                logger.trace('Deleting room "' + roomName + '"');

                users.removeRoomUsers(roomName);

                delete rooms[cleanRoomName(roomName)];
            }
        }

        function getRoomNameFromHash(hash) {
            if (hash.length && hash[0] === '/') {
                hash = hash.substr(1);
            }

            var parts = hash.split('/');
            if (parts[0] === 'rooms') {
                return parts[1];
            }

            return null;
        }

        //#endregion

        function isSelf(userdata) {
            return client.chat.state.name === userdata.Name;
        }

        function setInitialized(roomName) {
            var room = roomName ? getRoom(roomName) : ru.getCurrentRoomElements();
            room.setInitialized();
        }

        function setRoomTrimmable(roomName, canTrimMessages) {
            var room = getRoom(roomName);
            room.setTrimmable(canTrimMessages);
        }

        function setRoomListStatuses(roomName) {
            var room = roomName ? getRoom(roomName) : ru.getCurrentRoomElements();
            room.setListState(room.owners);
        }

        // #region Join, Set, Populate Room Functions

        function joinRoom(roomName) {
            logger.trace('joinRoom(' + roomName + ')');
            try {
                client.chat.server.send('/join ' + roomName, client.chat.state.activeRoom)
                    .fail(function (e) {
                        // TODO: setActiveRoom('Lobby');
                        if (e.source === 'HubException') {
                            messages.addErrorToActiveRoom(e.message);
                        }
                    });
            } catch (e) {
                client.connection.hub.log('openRoom failed');
            }
        }

        function setActiveRoom(roomName) {
            logger.trace('setActiveRoom(' + roomName + ')');

            var hash = (document.location.hash || '#').substr(1),
                hashRoomName = getRoomNameFromHash(hash);

            if (hashRoomName && hashRoomName === roomName) {
                ru.setActiveRoomCore(roomName);
            } else {
                document.location.hash = '#/rooms/' + roomName;
            }
        }

        function activateOrOpenRoom(roomName) {
            logger.trace('activateOrOpenRoom(' + roomName + ')');

            if (hasRoom(roomName)) {
                setActiveRoom(roomName);
            } else {
                joinRoom(roomName);
            }
        }

        function populateRoom(room, d) {
            var deferred = d || $.Deferred();

            client.connection.hub.log('populateRoom(' + room + ')');

            // Populate the list of users rooms and messages
            client.chat.server.getRoomInfo(room)
                .done(function (roomInfo) {
                    client.connection.hub.log('populateRoom done(' + room + ')');

                    populateRoomFromInfo(roomInfo);

                    deferred.resolveWith(client.chat);
                })
                .fail(function (e) {
                    client.connection.hub.log('populateRoom failed(' + room + ', ' + e + ')');

                    setTimeout(function () {
                        populateRoom(room, deferred);
                    }, 1000);
                });

            return deferred.promise();
        }

        function populateRoomFromInfo(roomInfo) {
            var room = roomInfo.Name;

            $.each(roomInfo.Users, function () {
                users.createRoomUser(this, room);
            });

            $.each(roomInfo.Owners, function () {
                var user = users.get(this);

                if (user !== undefined && room in user.roomUsers) {
                    user.roomUsers[room].setOwner(true);
                } else {
                    logger.warn('unable to find user "' + this + '"');
                }
            });

            logger.info('loading recent messages');
            $.each(roomInfo.RecentMessages, function () {
                this.isHistory = true;
                $this.trigger(events.rooms.client.createMessage, [this, room]);
            });
            logger.info('finished loading recent messages');

            ru.updateRoomTopic(roomInfo.Name, roomInfo.Topic);

            // mark room as initialized to differentiate messages
            // that are added after initial population
            setInitialized(room);
            ru.scrollToBottom(room);
            setRoomListStatuses(room);

            // Watch the messages after the defer, since room messages
            // may be appended if we are just joining the room
            messages.watchMessageScroll(messageIds, room);
        }

        // #endregion

        function openRoomFromHash() {
            $.history.init(function (hash) {
                var roomName = getRoomNameFromHash(hash);

                if (roomName) {
                    if (ru.setActiveRoomCore(roomName) === false &&
                        roomName !== 'Lobby') {
                        joinRoom(roomName);
                    }
                }
            });
        }

        function scrollRoomTop(roomInfo) {
            // Do nothing if we're loading history already
            if (loadingHistory === true) {
                return;
            }

            loadingHistory = true;

            try {
                // Show a little animation so the user experience looks fancy
                ru.setLoadingHistory(true);
                setRoomTrimmable(roomInfo.name, false);

                logger.trace('getPreviousMessages(' + roomInfo.name + ')');

                client.chat.server.getPreviousMessages(roomInfo.messageId)
                    .done(function (previousMessages) {
                        logger.trace('getPreviousMessages.done(' + roomInfo.name + ')');

                        // Insert message history into the room
                        messages.prependChatMessages($.map(previousMessages, function (data) {
                            return new Message(data);
                        }), roomInfo.name);

                        loadingHistory = false;
                        ru.setLoadingHistory(false);
                    })
                    .fail(function (e) {
                        logger.trace('getPreviousMessages.failed(' + roomInfo.name + ', ' + e + ')');

                        loadingHistory = false;
                        ru.setLoadingHistory(false);
                    });
            } catch (e) {
                logger.trace('getPreviousMessages failed');
                ru.setLoadingHistory(false);
            }
        }

        //
        // Hub Handlers
        //

        var handlers = {
            bind: function () {
                client.chat.client.roomClosed = this.roomClosed;
                client.chat.client.roomUnClosed = this.roomUnClosed;
                client.chat.client.roomLoaded = this.roomLoaded;
                client.chat.client.lockRoom = this.lockRoom;

                client.chat.client.leave = this.leave;

                client.chat.client.listUsers = this.listUsers;
                client.chat.client.listAllowedUsers = this.listAllowedUsers;

                client.chat.client.showUsersRoomList = this.showUsersRoomList;
                client.chat.client.showUsersOwnedRoomList = this.showUsersOwnedRoomList;
                client.chat.client.showUsersInRoom = this.showUsersInRoom;
                client.chat.client.showRooms = this.showRooms;
                client.chat.client.showUserInfo = this.showUserInfo;
            },

            roomClosed: function (roomName) {
                messages.addNotificationToActiveRoom(utility.getLanguageResource('Chat_RoomNowClosed', roomName));

                var room = getRoom(roomName);

                if (room !== null) {
                    room.setClosed(true);

                    if (state.get().activeRoom === roomName) {
                        ui.toggleMessageSection(true);
                    }
                }
            },

            roomUnClosed: function (roomName) {
                messages.addNotificationToActiveRoom(utility.getLanguageResource('Chat_RoomNowOpen', roomName));

                var room = getRoom(roomName);

                if (room !== null) {
                    room.setClosed(false);

                    if (state.get().activeRoom === roomName) {
                        ui.toggleMessageSection(false);
                    }
                }
            },

            roomLoaded: function(roomInfo) {
                populateRoomFromInfo(roomInfo);

                if (roomsToLoad === 1) {
                    ui.hideSplashScreen();
                }
                else {
                    roomsToLoad = roomsToLoad - 1;
                }
            },

            lockRoom: function (user, roomName, userHasAccess) {
                if (!isSelf(user) && state.get().activeRoom === roomName) {
                    messages.addNotificationToActiveRoom(utility.getLanguageResource('Chat_UserLockedRoom', user.Name, roomName));
                }

                var room = getRoom(roomName);

                if (room !== null) {
                    if (userHasAccess) {
                        room.setLocked(true);
                        lobby.lockRoom(roomName);
                    } else {
                        lobby.removeRoom(roomName);
                    }
                }
            },

            leave: function (userdata, roomName) {
                if (isSelf(userdata)) {
                    if (chat.state.activeRoom === room) {
                        setActiveRoom('Lobby');
                    }

                    removeRoom(roomName);
                } else {
                    users.remove(userdata, roomName);
                    messages.addNotification(utility.getLanguageResource('Chat_UserLeftRoom', user.Name, room), room);
                }
            },

            listAllowedUsers: function (roomName, isPrivate, allowedUsers) {
                if (!isPrivate) {
                    messages.addListToActiveRoom(utility.getLanguageResource('Chat_RoomNotPrivateAllowed', roomName), []);
                } else if (allowedUsers.length === 0) {
                    messages.addListToActiveRoom(utility.getLanguageResource('Chat_RoomPrivateNoUsersAllowed', roomName), []);
                } else {
                    messages.addListToActiveRoom(utility.getLanguageResource('Chat_RoomPrivateUsersAllowedResults', roomName), [allowedUsers.join(', ')]);
                }
            },

            showUsersRoomList: function (user, rooms) {
                if (rooms.length === 0) {
                    messages.addListToActiveRoom(utility.getLanguageResource('Chat_UserNotInRooms', user.Name, user.Status), []);
                } else {
                    messages.addListToActiveRoom(utility.getLanguageResource('Chat_UserInRooms', user.Name, user.Status), [rooms.join(', ')]);
                }
            },

            showUsersOwnedRoomList: function (username, ownedRooms) {
                if (ownedRooms.length === 0) {
                    messages.addListToActiveRoom(utility.getLanguageResource('Chat_UserOwnsNoRooms', username), []);
                } else {
                    messages.addListToActiveRoom(utility.getLanguageResource('Chat_UserOwnsRooms', username), [ownedRooms.join(', ')]);
                }
            },

            listUsers: function (usernames) {
                if (users.length === 0) {
                    messages.addListToActiveRoom(utility.getLanguageResource('Chat_RoomSearchEmpty'), []);
                } else {
                    messages.addListToActiveRoom(utility.getLanguageResource('Chat_RoomSearchResults'), [usernames.join(', ')]);
                }
            },

            showUsersInRoom: function (roomName, usernames) {
                var header = utility.getLanguageResource('Chat_RoomUsersHeader', roomName);

                if (usernames.length === 0) {
                    messages.addListToActiveRoom(header, [utility.getLanguageResource('Chat_RoomUsersEmpty')]);
                } else {
                    messages.addListToActiveRoom(header, $.map(usernames, function () {
                        return '- ' + this;
                    }));
                }
            },

            //TODO: remove, not called anywhere.
            showRooms: function (rooms) {
                if (!rooms.length) {
                    messages.addListToActiveRoom('Rooms', [utility.getLanguageResource('Chat_NoRoomsAvailable')]);
                } else {
                    // sort rooms by count descending then name
                    var sorted = rooms.sort(function (a, b) {
                        if (a.Closed && !b.Closed) {
                            return 1;
                        } else if (b.Closed && !a.Closed) {
                            return -1;
                        }

                        if (a.Count > b.Count) {
                            return -1;
                        } else if (b.Count > a.Count) {
                            return 1;
                        }

                        return a.Name.toString().toUpperCase().localeCompare(b.Name.toString().toUpperCase());
                    });

                    messagesaddListToActiveRoom('Rooms', $.map(sorted, function () {
                        return this.Name + ' (' + this.Count + ')';
                    }));
                }
            },

            showUserInfo: function (user) {
                var lastActivityDate = user.LastActivity.fromJsonDate(),
                    header,
                    list = [];

                var status = "Currently " + user.Status;
                if (user.IsAfk) {
                    status += user.Status === 'Active' ? ' but ' : ' and ';
                    status += ' is Afk';
                }

                header = 'User information for ' + user.Name + ' (' + status + ' - last seen ' + $.timeago(lastActivityDate) + ')';

                if (user.AfkNote) {
                    list.push('Afk: ' + user.AfkNote);
                } else if (user.Note) {
                    list.push('Note: ' + user.Note);
                }

                messages.addListToActiveRoom(header, list);

                $.getJSON('https://secure.gravatar.com/' + user.Hash + '.json?callback=?', function (profile) {
                    ru.showGravatarProfile(profile.entry[0]);
                });

                this.showUsersOwnedRoomList(user.Name, user.OwnedRooms);
            }
        };

        return {
            activate: function () {
                ru = kernel.get('jabbr/components/rooms.ui');
                client = kernel.get('jabbr/client');
                ui = kernel.get('jabbr/ui');
                users = kernel.get('jabbr/components/users');
                messages = kernel.get('jabbr/components/messages');
                lobby = kernel.get('jabbr/components/lobby');

                logger.trace('activated');

                handlers.bind();
            },

            roomsToLoad: function (value) {
                if (typeof a !== 'undefined') {
                    roomsToLoad = value;
                }

                return roomsToLoad;
            },

            messageHistory: messageHistory,
            historyLocation: historyLocation,

            rooms: rooms,
            roomCache: roomCache,

            inRoomCache: function (roomName) {
                return cleanRoomName(roomName) in roomCache;
            },

            cleanRoomName: cleanRoomName,
            getRoom: getRoom,
            hasRoom: hasRoom,
            validRoom: validRoom,
            removeRoom: removeRoom,
            getRoomNameFromHash: getRoomNameFromHash,
            setActiveRoom: setActiveRoom,
            activateOrOpenRoom: activateOrOpenRoom,
            openRoomFromHash: openRoomFromHash,

            isSelf: isSelf,

            setInitialized: setInitialized,
            setRoomTrimmable: setRoomTrimmable,

            getRoomId: function (roomName) {
                return window.escape(roomName.toString().toLowerCase()).replace(/[^A-Za-z0-9]/g, '_');
            },

            activeRoomChanged: function (room) {
                if (room === 'Lobby') {
                    // Remove the active room
                    client.chat.state.activeRoom = undefined;
                } else {
                    // When the active room changes update the client state and the cookie
                    client.chat.state.activeRoom = room;
                }

                $this.trigger(events.rooms.client.scrollToBottom, room);
                state.save(client.chat.state.activeRoom);

                this.historyLocation = (messageHistory[client.chat.state.activeRoom] || []).length;
                ui.resetSelection(); // Clear last message selection.
            },
            populateRoom: populateRoom,
            scrollRoomTop: scrollRoomTop,

            joinRoom: joinRoom,
            leaveRoom: function (roomName) {
                logger.trace('leaveRoom(' + roomName + ')');
                try {
                    client.chat.server.send('/leave ' + roomName, client.chat.state.activeRoom)
                        .fail(function (e) {
                            if(e.source === 'HubException') {
                                messages.addErrorToActiveRoom(e.message);
                            }
                        });
                } catch (e) {
                    // This can fail if the server is offline
                    client.connection.hub.log('closeRoom room failed');
                }
            },

            addMessage: function (message) {
                messageIds.push(message.id);
            },

            bind: function (eventType, handler) {
                $this.bind(eventType, handler);
            }
        };
    };

    return function () {
        if (object === null) {
            object = initialize();
            kernel.bind('jabbr/components/rooms.client', object);
        }

        return object;
    };
});