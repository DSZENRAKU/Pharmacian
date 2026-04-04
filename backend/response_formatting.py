def error_response(message, status_code=400):
    return {"error": message}, status_code


def refine_response(payload):
    return payload, 200


def success_response(payload):
    return payload, 200
