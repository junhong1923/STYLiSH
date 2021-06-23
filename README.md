# Jun Hong Lin

## Working Flow

###  SSH connect to AWS ec2 instance machine
From local machine:
$ ssh -i [key.pem][DefaultUserName]@[PublicServerIP]

### Reversed Proxy - Nginx
1. install Nginx on ec2  
2. set up network security on AWS   
3. Modify nginx.conf file  
4. $ sudo service nginx restart  

### Website URL
http://3.142.177.193/

### Run Web Server in the Background
There are plenty of approach to run application in background. I choose to use "tmux" command line based on Linux system.  
$ sudo yum install tmux  
then open a new tmux to run the node.js application.

### Midterm
Dashboad link: https://junhong.tw/admin/dashboard.html


