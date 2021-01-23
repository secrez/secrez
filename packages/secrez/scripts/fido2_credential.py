# Copyright (c) 2018 Yubico AB
# All rights reserved.
#
#   Redistribution and use in source and binary forms, with or
#   without modification, are permitted provided that the following
#   conditions are met:
#
#    1. Redistributions of source code must retain the above copyright
#       notice, this list of conditions and the following disclaimer.
#    2. Redistributions in binary form must reproduce the above
#       copyright notice, this list of conditions and the following
#       disclaimer in the documentation and/or other materials provided
#       with the distribution.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
# "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
# LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
# FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
# COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
# INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
# BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
# LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
# CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
# LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
# ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
# POSSIBILITY OF SUCH DAMAGE.

from __future__ import print_function, absolute_import, unicode_literals

from fido2.hid import CtapHidDevice
from fido2.client import Fido2Client
from fido2.ctap2.extensions import HmacSecretExtension
from fido2.utils import websafe_encode

import sys, getopt, random, string

def randomString(stringLength=8):
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(stringLength))

argv = sys.argv[1:]
try:
    opts, args = getopt.getopt(argv,"i:n:",[])
except getopt.GetoptError:
    print('python fido2_credential.py -i id -n name')
    sys.exit(2)
for opt, arg in opts:
    if opt in ("-i"):
        user_id = arg
    elif opt in ("-n"):
        user_name = arg

try:
    from fido2.pcsc import CtapPcscDevice
except ImportError:
    CtapPcscDevice = None


def enumerate_devices():
    for dev in CtapHidDevice.list_devices():
        yield dev
    if CtapPcscDevice:
        for dev in CtapPcscDevice.list_devices():
            yield dev

for dev in enumerate_devices():
    client = Fido2Client(dev, "https://secrez.io")
    if HmacSecretExtension.NAME in client.info.extensions:
        break
else:
    print("No Authenticator with the HmacSecret extension found!")
    sys.exit(1)

rp = {"id": "secrez.io", "name": "secrez"}
user = {"id": bytes(user_id, encoding='utf-8'), "name": user_name}
challenge = bytes(randomString(12), encoding='utf-8')
hmac_ext = HmacSecretExtension(client.ctap2)
attestation_object, client_data = client.make_credential(
    {
        "rp": rp,
        "user": user,
        "challenge": challenge,
        "pubKeyCredParams": [{"type": "public-key", "alg": -7}],
        "extensions": hmac_ext.create_dict(),
    }
)
credential = attestation_object.auth_data.credential_data
print(websafe_encode(credential))
