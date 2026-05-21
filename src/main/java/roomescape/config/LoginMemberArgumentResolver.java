package roomescape.config;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.MethodParameter;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import roomescape.annotation.LoginMember;
import roomescape.dao.AuthDao;
import roomescape.domain.User;
import roomescape.exception.AuthenticationException;
import roomescape.util.JwtUtil;

@Component
@RequiredArgsConstructor
public class LoginMemberArgumentResolver implements HandlerMethodArgumentResolver {

    private static final String AUTHORIZATION = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtUtil jwtUtil;
    private final AuthDao authDao;

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(LoginMember.class)
                && User.class.isAssignableFrom(parameter.getParameterType());
    }

    @Override
    public Object resolveArgument(
            MethodParameter parameter,
            ModelAndViewContainer mavContainer,
            NativeWebRequest webRequest,
            WebDataBinderFactory binderFactory
    ) {
        HttpServletRequest request = webRequest.getNativeRequest(HttpServletRequest.class);
        String authorization = request == null ? null : request.getHeader(AUTHORIZATION);

        if (authorization == null || !authorization.startsWith(BEARER_PREFIX)) {
            throw new AuthenticationException("로그인이 필요한 요청입니다.");
        }

        String token = authorization.substring(BEARER_PREFIX.length());
        if (!jwtUtil.isValid(token)) {
            throw new AuthenticationException("유효하지 않은 인증 정보입니다.");
        }

        Long userId = jwtUtil.getUserId(token);
        return authDao.findById(userId)
                .orElseThrow(() -> new AuthenticationException("유효하지 않은 인증 정보입니다."));
    }
}
