## iceJabbR [![Build Status](https://travis-ci.org/fuzeman/vox.png)](https://travis-ci.org/fuzeman/vox)
iceJabbR is a chat application forked from [JabbR](https://github.com/JabbR/JabbR/) and built with ASP.NET using SignalR.

iceJabbR includes a number of extra features *(not available in JabbR upstream yet)*:

 - Message editing
 - Room notification filter *- choose between all messages or mentions only*
 - Custom mention strings *- extra user-definable strings to mark as a mention*
 - Image lightbox
 - Rdio provider
 - Activity ticker *- stream of activity from other rooms*
 - Cross-service music sharing via [Plexr](https://github.com/fuzeman/Plexr) *- displays inline music content in a users chosen service (Spotify, Rdio)*

Plus a large number of bug, usability and element alignment fixes.


## Features and Commands
    
### Public and private chat rooms
Quickly join a public chat room with

    /join [roomName]
    
And join any private room with an invite code

    /join [roomName] [inviteCode]
    
### Gravatar
Assign a gravatar to your nick. Be recognized, even in JabbR!

    Type /gravatar [email] - to set your gravatar.
    
### Notifications
* Integrated into Chrome to provide you with popup desktop notifications. 
* Live Twitter mentions powered by twitterbot, so that you never miss out on the conversation.
* Audio notifications.
    
### Content Provider Support
Inline image and content support for your favorite sites:

**Video**

* Youtube
* CollegeHumor
* UStream
* Vimeo

**Music**

* Rdio
* Spotify
* SoundCloud
* MixCloud

**Office**

* Pastie
* join.me
* SlideShare
* Uservoice
* Google Docs
* Github Gists

**Tech**

* GitHub Issues
* NuGet Packages

**Other**

* Google Maps
* imgur
* Twitter
* BBC News
* NerdDinner

#### And if you ever happen to get lost...
    Type /? - to show the full list of JabbR Commands
