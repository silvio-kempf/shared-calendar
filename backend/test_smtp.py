import smtplib

host = 'smtp.web.de'
port = 587
user = 'managopio@web.de'
password = input('Password: ')

with smtplib.SMTP(host, port, timeout=10) as s:
    s.ehlo()
    s.starttls()
    s.login(user, password)
    print('Login OK')
