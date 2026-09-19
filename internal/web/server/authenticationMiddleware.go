package server

import (
	"context"
	"net/http"
	"regexp"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"k8s.io/klog/v2"
)

type authenticationMiddleware struct {
	expectedAud string
	expectedIss string

	tokenVerifier *oidc.IDTokenVerifier

	matcher *regexp.Regexp
}

func NewAuthenticationMiddleware(expectedAud, expectedIss string) authenticationMiddleware {
	return authenticationMiddleware{
		expectedAud: expectedAud,
		expectedIss: expectedIss,

		matcher: regexp.MustCompile(`^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$`),
	}.initialize()
}

func (m authenticationMiddleware) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authentication := r.Header.Get("Authorization")

		captures := m.matcher.FindStringSubmatch(authentication)
		if nil == captures || len(captures) != 2 {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		tokenString := captures[1] // Group 1 captures the actual JWT

		ctx, cancelFunc := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancelFunc()

		token, err := m.tokenVerifier.Verify(ctx, tokenString)
		if err != nil {
			klog.ErrorS(err, "Failed to parse and verify token", "tokenString", tokenString)
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		klog.V(10).InfoS("Authenticated", "subject", token.Subject)
		next.ServeHTTP(w, r)
	})
}

func (m authenticationMiddleware) initialize() authenticationMiddleware {
	ctx, cancelFunc := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancelFunc()

	klog.V(1).InfoS("Creating authentication provider", "issuer", m.expectedIss)
	provider, err := oidc.NewProvider(ctx, m.expectedIss)
	if err != nil {
		klog.Exitf("Failed to create new OIDC provider for '%s': %v", m.expectedIss, err)
	}

	klog.V(1).InfoS("Creating authentication verifier", "issuer", m.expectedIss)
	m.tokenVerifier = provider.Verifier(&oidc.Config{
		SkipClientIDCheck: true,
	})
	klog.InfoS("Authentication middleware initialized", "issuer", m.expectedIss)

	return m
}
